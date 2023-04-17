/* Copyright (c) 2018-2023, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

package org.opfab.cards.publication.services;

import feign.FeignException;
import lombok.extern.slf4j.Slf4j;

import org.opfab.cards.model.CardOperationTypeEnum;
import org.opfab.cards.publication.model.*;
import org.opfab.cards.publication.repositories.CardRepository;
import org.opfab.cards.publication.repositories.UserBasedOperationResult;
import org.opfab.springtools.configuration.oauth.ProcessesCache;
import org.opfab.springtools.error.model.ApiError;
import org.opfab.springtools.error.model.ApiErrorException;
import org.opfab.users.model.CurrentUserWithPerimeters;
import org.opfab.users.model.PermissionEnum;
import org.opfab.businessconfig.model.Process;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;


import jakarta.validation.ConstraintViolationException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * <p>
 * Responsible of processing card : check format , save in repository and send
 * notification
 */
@Slf4j
public class CardProcessingService {

    private CardNotificationService cardNotificationService;
    private CardRepository cardRepository;
    private ExternalAppService externalAppService;
    private CardPermissionControlService cardPermissionControlService;
    private CardTranslationService cardTranslationService;
    private ProcessesCache processesCache;

    boolean checkAuthenticationForCardSending;
    boolean checkPerimeterForCardSending;
    boolean authorizeToSendCardWithInvalidProcessState;

    public static final String UNEXISTING_PROCESS_STATE = "Impossible to publish card because process and/or state does not exist (process=%1$s, state=%2$s, processVersion=%3$s, processInstanceId=%4$s)";

    public CardProcessingService(
            CardNotificationService cardNotificationService,
            CardRepository cardRepository,
            ExternalAppService externalAppService,
            CardTranslationService cardTranslationService,
            ProcessesCache processesCache,
            boolean checkAuthenticationForCardSending,
            boolean checkPerimeterForCardSending,
            boolean authorizeToSendCardWithInvalidProcessState) {
        this.cardNotificationService = cardNotificationService;
        this.cardRepository = cardRepository;
        this.externalAppService = externalAppService;
        this.cardPermissionControlService = new CardPermissionControlService();
        this.cardTranslationService = cardTranslationService;
        this.processesCache = processesCache;
        this.checkAuthenticationForCardSending = checkAuthenticationForCardSending;
        this.checkPerimeterForCardSending = checkPerimeterForCardSending;
        this.authorizeToSendCardWithInvalidProcessState = authorizeToSendCardWithInvalidProcessState;

    }

    public void processCard(CardPublicationData card) {
        processCard(card, Optional.empty(), Optional.empty());
    }

    public void processCard(CardPublicationData card, Optional<CurrentUserWithPerimeters> user, Optional<Jwt> jwt) {

        if (card.getPublisherType() == null)
            card.setPublisherType(PublisherTypeEnum.EXTERNAL);

        if (user.isPresent() && checkAuthenticationForCardSending && !cardPermissionControlService
                .isCardPublisherAllowedForUser(card, user.get().getUserData().getLogin())) {

            throw new ApiErrorException(ApiError.builder()
                    .status(HttpStatus.FORBIDDEN)
                    .message(buildPublisherErrorMessage(card, user.get().getUserData().getLogin(), false))
                    .build());
        }
        validate(card);
        if (!authorizeToSendCardWithInvalidProcessState)
            checkProcessStateExistsInBundles(card);
        if (user.isPresent() && checkPerimeterForCardSending
                && !cardPermissionControlService.isUserAuthorizedToSendCard(card, user.get())) {
            throw new AccessDeniedException("user not authorized, the card is rejected");
        }
        // set empty user otherwise it will be processed as a usercard
        processOneCard(card, Optional.empty(), jwt);
    }

    public void processUserCard(CardPublicationData card, CurrentUserWithPerimeters user, Optional<Jwt> jwt) {
        card.setPublisherType(PublisherTypeEnum.ENTITY);
        validate(card);
        if (!authorizeToSendCardWithInvalidProcessState)
            checkProcessStateExistsInBundles(card);
        processOneCard(card, Optional.of(user), jwt);
    }

    private void processOneCard(CardPublicationData card, Optional<CurrentUserWithPerimeters> user, Optional<Jwt> jwt) {
        card.prepare(Instant.ofEpochMilli(Instant.now().toEpochMilli()));
        cardTranslationService.translate(card);
        CardPublicationData oldCard = getExistingCard(card.getId());
        if (user.isPresent()) {
            if (oldCard != null && !cardPermissionControlService.isUserAllowedToEditCard(user.get(), card, oldCard))
                throw new ApiErrorException(ApiError.builder()
                        .status(HttpStatus.FORBIDDEN)
                        .message(
                                "User is not the sender of the original card or user is not part of entities allowed to edit card. Card is rejected")
                        .build());

            if (!cardPermissionControlService.isUserAuthorizedToSendCard(card, user.get())) {
                throw new AccessDeniedException("user not authorized, the card is rejected");
            }

            if (!cardPermissionControlService.isCardPublisherInUserEntities(card, user.get()))
                // throw a runtime exception to be handled by Mono.onErrorResume()
                throw new IllegalArgumentException("Publisher is not valid, the card is rejected");
            log.info("Send user card to external app with jwt present " + jwt.isPresent());
            externalAppService.sendCardToExternalApplication(card, jwt);
        }

        if ((card.getToNotify() == null) || Boolean.TRUE.equals(card.getToNotify())) {
            if (oldCard != null)
                deleteChildCardsProcess(card, jwt);
            cardRepository.saveCard(card);
            if (oldCard == null)
                cardNotificationService.notifyOneCard(card, CardOperationTypeEnum.ADD);
            else
                cardNotificationService.notifyOneCard(card, CardOperationTypeEnum.UPDATE);
        }

        cardRepository.saveCardToArchive(new ArchivedCardPublicationData(card));

        log.debug("Card persisted (process = {} , processInstanceId= {} , state = {} ", card.getProcess(),
                card.getProcessInstanceId(), card.getState());
    }

    private Void deleteChildCardsProcess(CardPublicationData card, Optional<Jwt> jwt) {
        if (Boolean.FALSE.equals(card.getKeepChildCards())) {
            String idCard = card.getProcess() + "." + card.getProcessInstanceId();
            Optional<List<CardPublicationData>> childCard = cardRepository
                    .findChildCard(cardRepository.findCardById(idCard));
            if (childCard.isPresent()) {
                deleteCards(childCard.get(), card.getPublishDate(), jwt);
            }
        }
        return null;
    }

    private void deleteCards(List<CardPublicationData> cardPublicationData, Instant deletionDate, Optional<Jwt> jwt) {
        cardPublicationData.forEach(x -> deleteCard(x.getId(), deletionDate, jwt));
    }

    /**
     * Apply bean validation to card
     *
     * @param c
     * @throws ConstraintViolationException if there is an error during validation
     *                                      based on object annotation configuration
     */
    void validate(CardPublicationData c) throws ConstraintViolationException {

        if (!checkIsParentCardIdExisting(c))
            throw new ConstraintViolationException(
                    "The parentCardId " + c.getParentCardId() + " is not the id of any card", null);

        if (!checkIsInitialParentCardUidExisting(c))
            throw new ConstraintViolationException(
                    "The initialParentCardUid " + c.getInitialParentCardUid() + " is not the uid of any card", null);

        if (c.getPublisher() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no publisher", null);

        if (c.getProcess() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no process", null);

        if (c.getProcessVersion() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no processVersion",
                    null);

        if (c.getState() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no state", null);

        if (c.getProcessInstanceId() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no processInstanceId",
                    null);

        if (c.getSeverity() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no severity", null);

        if (c.getTitle() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no title", null);

        if (c.getSummary() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no summary", null);

        if (c.getStartDate() == null)
            throw new ConstraintViolationException("Impossible to publish card because there is no startDate", null);

        if (!checkIsEndDateAfterStartDate(c))
            throw new ConstraintViolationException("constraint violation : endDate must be after startDate", null);

        if (!checkIsExpirationDateAfterStartDate(c))
            throw new ConstraintViolationException("constraint violation : expirationDate must be after startDate",
                    null);

        if (!checkIsAllTimeSpanEndDateAfterStartDate(c))
            throw new ConstraintViolationException("constraint violation : TimeSpan.end must be after TimeSpan.start",
                    null);

        if (!checkIsAllHoursAndMinutesFilled(c))
            throw new ConstraintViolationException(
                    "constraint violation : TimeSpan.Recurrence.HoursAndMinutes must be filled", null);

        if (!checkIsAllDaysOfWeekValid(c))
            throw new ConstraintViolationException(
                    "constraint violation : TimeSpan.Recurrence.daysOfWeek must be filled with values from 1 to 7",
                    null);

        if (!checkIsAllMonthsValid(c))
            throw new ConstraintViolationException(
                    "constraint violation : TimeSpan.Recurrence.months must be filled with values from 0 to 11", null);

        // constraint check : process and state must not contain "." (because we use it
        // as a separator)
        if (!checkIsDotCharacterNotInProcessAndState(c))
            throw new ConstraintViolationException(
                    "constraint violation : character '.' is forbidden in process and state", null);
    }

    private CardPublicationData getExistingCard(String cardId) {
        return cardRepository.findCardById(cardId);
    }

    boolean checkIsCardIdExisting(String cardId) {
        return !((Optional.ofNullable(cardId).isPresent()) && (cardRepository.findCardById(cardId) == null));
    }

    boolean checkIsParentCardIdExisting(CardPublicationData c) {
        return checkIsCardIdExisting(c.getParentCardId());
    }

    // The check of existence of uid is done in archivedCards collection
    boolean checkIsInitialParentCardUidExisting(CardPublicationData c) {
        String initialParentCardUid = c.getInitialParentCardUid();

        return !((Optional.ofNullable(initialParentCardUid).isPresent()) &&
                (!cardRepository.findArchivedCardByUid(initialParentCardUid).isPresent()));
    }

    public boolean doesProcessStateExistInBundles(String processId, String processVersion, String stateId) {
        if (processesCache != null) {
            try {
                Process process = processesCache.fetchProcessFromCacheOrProxy(processId, processVersion);
                if ((process != null) && (process.getStates() != null) && (process.getStates().containsKey(stateId)))
                    return true;
            } catch (FeignException ex) {
                log.error("Error getting process information for process={} and processVersion={}", processId,
                        processVersion, ex);
            }
        }
        return false;
    }

    boolean checkIsEndDateAfterStartDate(CardPublicationData c) {
        Instant endDateInstant = c.getEndDate();
        Instant startDateInstant = c.getStartDate();
        return !((endDateInstant != null) && (startDateInstant != null)
                && (endDateInstant.compareTo(startDateInstant) < 0));
    }

    boolean checkIsExpirationDateAfterStartDate(CardPublicationData c) {
        Instant expirationDateInstant = c.getExpirationDate();
        Instant startDateInstant = c.getStartDate();
        return !((expirationDateInstant != null) && (startDateInstant != null)
                && (expirationDateInstant.compareTo(startDateInstant) < 0));
    }

    boolean checkIsDotCharacterNotInProcessAndState(CardPublicationData c) {
        return !((c.getProcess().contains(Character.toString('.'))) ||
                (c.getState() != null && c.getState().contains(Character.toString('.'))));
    }

    boolean checkIsAllTimeSpanEndDateAfterStartDate(CardPublicationData c) {
        if (c.getTimeSpans() != null) {
            for (int i = 0; i < c.getTimeSpans().size(); i++) {
                if (c.getTimeSpans().get(i) != null) {
                    Instant endInstant = c.getTimeSpans().get(i).getEnd();
                    Instant startInstant = c.getTimeSpans().get(i).getStart();
                    if ((endInstant != null) && (endInstant.compareTo(startInstant) < 0))
                        return false;
                }
            }
        }
        return true;
    }

    boolean checkIsAllHoursAndMinutesFilled(CardPublicationData c) {
        if (c.getTimeSpans() != null) {
            for (TimeSpan currentTimeSpan : c.getTimeSpans()) {

                if ((currentTimeSpan != null) && (currentTimeSpan.getRecurrence() != null)) {
                    HoursAndMinutes currentHoursAndMinutes = currentTimeSpan.getRecurrence().getHoursAndMinutes();
                    if ((currentHoursAndMinutes == null) || (currentHoursAndMinutes.getHours() == null)
                            || (currentHoursAndMinutes.getMinutes() == null))
                        return false;
                }
            }
        }
        return true;
    }

    boolean checkIsAllDaysOfWeekValid(CardPublicationData c) {
        if (c.getTimeSpans() == null)
            return true;

        for (TimeSpan currentTimeSpan : c.getTimeSpans()) {

            if ((currentTimeSpan == null) || (currentTimeSpan.getRecurrence() == null))
                return true;

            List<Integer> currentDaysOfWeek = currentTimeSpan.getRecurrence().getDaysOfWeek();

            if (currentDaysOfWeek != null) {
                for (Integer dayOfWeek : currentDaysOfWeek) {
                    if ((dayOfWeek < 1) || (dayOfWeek > 7))
                        return false;
                }
            }
        }
        return true;
    }

    boolean checkIsAllMonthsValid(CardPublicationData c) {
        if (c.getTimeSpans() == null)
            return true;

        for (TimeSpan currentTimeSpan : c.getTimeSpans()) {

            if ((currentTimeSpan == null) || (currentTimeSpan.getRecurrence() == null))
                return true;

            List<Integer> currentMonths = currentTimeSpan.getRecurrence().getMonths();

            if (currentMonths != null) {
                for (Integer month : currentMonths) {
                    if ((month < 0) || (month > 11))
                        return false;
                }
            }
        }
        return true;
    }

    public void checkProcessStateExistsInBundles(CardPublicationData card) {
        if (!doesProcessStateExistInBundles(card.getProcess(), card.getProcessVersion(), card.getState())) {
            throw new ApiErrorException(
                    ApiError.builder()
                            .status(HttpStatus.BAD_REQUEST)
                            .message(String.format(UNEXISTING_PROCESS_STATE, card.getProcess(), card.getState(),
                                    card.getProcessVersion(), card.getProcessInstanceId()))
                            .build());
        }
    }

    public void deleteCard(String id, Optional<Jwt> jwt) {
        CardPublicationData cardToDelete = cardRepository.findCardById(id);
        deleteCard(cardToDelete, jwt);
    }

    public void deleteCard(String id, Instant deletionDate, Optional<Jwt> jwt) {
        CardPublicationData cardToDelete = cardRepository.findCardById(id);
        deleteCard(cardToDelete, deletionDate, jwt);
    }

    public void deleteCards(Instant endDateBefore) {
        List<CardPublicationData> deletedCards = cardRepository.deleteCardsByEndDateBefore(endDateBefore);
        deletedCards.stream().forEach(
                deletedCard -> cardNotificationService.notifyOneCard(deletedCard, CardOperationTypeEnum.DELETE));
    }

    public Optional<CardPublicationData> deleteCard(String id, Optional<CurrentUserWithPerimeters> user,
            Optional<Jwt> jwt) {

        CardPublicationData cardToDelete = cardRepository.findCardById(id);
        if (user.isPresent()) { // if user is not present it means we have checkAuthenticationForCardSending =
                                // false
            boolean isAdmin = cardPermissionControlService.hasCurrentUserAnyPermission(user.get(),
                    PermissionEnum.ADMIN);
            String login = user.get().getUserData().getLogin();
            if (cardToDelete != null && !isAdmin && checkAuthenticationForCardSending
                    && !cardPermissionControlService.isCardPublisherAllowedForUser(cardToDelete, login)) {

                throw new ApiErrorException(ApiError.builder()
                        .status(HttpStatus.FORBIDDEN)
                        .message(buildPublisherErrorMessage(cardToDelete, login, true))
                        .build());
            }
        }

        return deleteCard(cardToDelete, jwt);
    }

    public Optional<CardPublicationData> prepareAndDeleteCard(CardPublicationData card) {
        if (card.getId() == null || card.getId().isEmpty()) {
            card.prepare(card.getPublishDate());
        }
        return deleteCard(card, Optional.empty());
    }

    public Optional<CardPublicationData> deleteUserCard(String id, CurrentUserWithPerimeters user, Optional<Jwt> jwt) {
        CardPublicationData cardToDelete = cardRepository.findCardById(id);
        if (cardToDelete == null)
            return Optional.empty();

        if (cardPermissionControlService.isUserAllowedToDeleteThisCard(cardToDelete, user)) {
            return deleteCard(cardToDelete, jwt);
        } else {
            throw new ApiErrorException(ApiError.builder()
                    .status(HttpStatus.FORBIDDEN)
                    .message("User not allowed to delete this card")
                    .build());
        }
    }

    public void deleteCardsByExpirationDate(Instant expirationDate) {
        cardRepository.findCardsByExpirationDate(expirationDate)
                .forEach(cardToDelete -> deleteCard(cardToDelete, expirationDate, Optional.empty()));
    }

    private Optional<CardPublicationData> deleteCard(CardPublicationData cardToDelete, Optional<Jwt> jwt) {
        return deleteCard(cardToDelete, Instant.now(), jwt);
    }

    private Optional<CardPublicationData> deleteCard(CardPublicationData cardToDelete, Instant deletionDate,
            Optional<Jwt> jwt) {
        Optional<CardPublicationData> deletedCard = Optional.ofNullable(cardToDelete);
        if (null != cardToDelete) {
            cardNotificationService.notifyOneCard(cardToDelete, CardOperationTypeEnum.DELETE);
            cardRepository.deleteCard(cardToDelete);
            cardRepository.findArchivedCardByUid(cardToDelete.getUid()).ifPresent(deleted -> {
                deleted.setDeletionDate(deletionDate);
                cardRepository.updateArchivedCard(deleted);
            });

            externalAppService.notifyExternalApplicationThatCardIsDeleted(cardToDelete, jwt);
            Optional<List<CardPublicationData>> childCard = cardRepository.findChildCard(cardToDelete);
            if (childCard.isPresent()) {
                childCard.get().forEach(x -> deleteCard(x.getId(), deletionDate, jwt));
            }
        }
        return deletedCard;
    }

    private String buildPublisherErrorMessage(CardPublicationData card, String login, boolean delete) {
        String errorMessagePrefix = "Card publisher is set to " + card.getPublisher() + " and account login is "
                + login;
        if (card.getRepresentative() != null) {
            errorMessagePrefix = "Card representative is set to " + card.getRepresentative() + " and account login is "
                    + login;
        }
        String errorMessageSuffix = delete ? "deleted" : "sent";
        return errorMessagePrefix + ", the card cannot be " + errorMessageSuffix;
    }

    public UserBasedOperationResult processUserAcknowledgement(String cardUid, CurrentUserWithPerimeters user,
            List<String> entitiesAcks) {
        if (cardPermissionControlService.isCurrentUserReadOnly(user) && entitiesAcks != null && !entitiesAcks.isEmpty())
            throw new ApiErrorException(ApiError.builder()
                    .status(HttpStatus.FORBIDDEN)
                    .message("Acknowledgement impossible : User has READONLY opfab role")
                    .build());

        if (!user.getUserData().getEntities().containsAll(entitiesAcks))
            throw new ApiErrorException(ApiError.builder()
                    .status(HttpStatus.FORBIDDEN)
                    .message("Acknowledgement impossible : User is not member of all the entities given in the request")
                    .build());

        cardRepository.findByUid(cardUid).ifPresent(selectedCard -> cardNotificationService
                .pushAckOfCardInEventBus(cardUid, selectedCard.getId(), entitiesAcks));

        log.info("Set ack on card with uid {} for user {} and entities {}", cardUid, user.getUserData().getLogin(),
                entitiesAcks);
        return cardRepository.addUserAck(user.getUserData(), cardUid, entitiesAcks);
    }

    public UserBasedOperationResult processUserRead(String cardUid, String userName) {
        log.info("Set read on card with uid {} for user {} ", cardUid, userName);
        return cardRepository.addUserRead(userName, cardUid);
    }

    public UserBasedOperationResult deleteUserRead(String cardUid, String userName) {
        log.info("Delete read on card with uid {} for user {} ", cardUid, userName);
        return cardRepository.deleteUserRead(userName, cardUid);
    }

    public UserBasedOperationResult deleteUserAcknowledgement(String cardUid, String userName) {
        log.info("Delete ack on card with uid {} for user {} ", cardUid, userName);
        return cardRepository.deleteUserAck(userName, cardUid);

    }

}
