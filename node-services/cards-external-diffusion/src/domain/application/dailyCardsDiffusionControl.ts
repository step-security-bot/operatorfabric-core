/* Copyright (c) 2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import SendMailService from '../server-side/sendMailService';
import CardsExternalDiffusionOpfabServicesInterface from '../server-side/cardsExternalDiffusionOpfabServicesInterface';
import CardsRoutingUtilities from './cardRoutingUtilities';
import ConfigDTO from '../client-side/configDTO';
import CardsExternalDiffusionDatabaseService from '../server-side/cardsExternaDiffusionDatabaseService';
import BusinessConfigOpfabServicesInterface from '../server-side/BusinessConfigOpfabServicesInterface';

export default class DailyCardsDiffusionControl {
    opfabUrlInMailContent: any;

    private cardsExternalDiffusionOpfabServicesInterface: CardsExternalDiffusionOpfabServicesInterface;
    private businessConfigOpfabServicesInterface: BusinessConfigOpfabServicesInterface;
    private cardsExternalDiffusionDatabaseService: CardsExternalDiffusionDatabaseService;
    private logger: any;
    private mailService: SendMailService;
    private from: string;
    private dailyEmailTitle: string;

    public setOpfabServicesInterface(
        cardsExternalDiffusionOpfabServicesInterface: CardsExternalDiffusionOpfabServicesInterface
    ) {
        this.cardsExternalDiffusionOpfabServicesInterface = cardsExternalDiffusionOpfabServicesInterface;
        return this;
    }

    public setOpfabBusinessConfigServicesInterface(
        businessConfigOpfabServicesInterface: BusinessConfigOpfabServicesInterface
    ) {
        this.businessConfigOpfabServicesInterface = businessConfigOpfabServicesInterface;
        return this;
    }

    public setCardsExternalDiffusionDatabaseService(
        cardsExternalDiffusionDatabaseService: CardsExternalDiffusionDatabaseService
    ) {
        this.cardsExternalDiffusionDatabaseService = cardsExternalDiffusionDatabaseService;
        return this;
    }

    public setLogger(logger: any) {
        this.logger = logger;
        return this;
    }

    public setMailService(mailservice: SendMailService) {
        this.mailService = mailservice;
        return this;
    }

    public setFrom(from: string) {
        this.from = from;
        return this;
    }

    public setSubjectPrefix(subjectPrefix: string) {
        this.subjectPrefix = subjectPrefix;
        return this;
    }

    public setBodyPrefix(bodyPrefix: string) {
        this.bodyPrefix = bodyPrefix;
        return this;
    }

    public setOpfabUrlInMailContent(opfabUrlInMailContent: any) {
        this.opfabUrlInMailContent = opfabUrlInMailContent;
        return this;
    }

    public setConfiguration(updated: ConfigDTO) {
        this.from = updated.mailFrom;
        this.subjectPrefix = updated.subjectPrefix;
        this.bodyPrefix = updated.bodyPrefix;
    }
    
    public setDailyEmailTitle(dailyEmailTitle: string) {
        this.dailyEmailTitle = dailyEmailTitle;
        return this;
    }


    public async checkCardsOfTheDay() {
        const users = this.cardsExternalDiffusionOpfabServicesInterface.getUsers();
        const userLogins = users.map((u) => u.login);

        const dateFrom = Date.now() - 24 * 60 * 60 * 1000;
        const cards = await this.cardsExternalDiffusionDatabaseService.getCards(dateFrom);
        userLogins.forEach(async (login) => {
            const resp = await this.cardsExternalDiffusionOpfabServicesInterface.getUserWithPerimetersByLogin(login);
            if (resp.isValid()) {
                const userWithPerimeters = resp.getData();
                if (this.isEmailSettingEnabled(userWithPerimeters) && userWithPerimeters.sendDailyEmail) {
                    const emailToPlainText = this.shouldEmailBePlainText(userWithPerimeters);
                    const visibleCards = cards.filter((card: any) =>
                        CardsRoutingUtilities.shouldUserReceiveTheCard(userWithPerimeters, card)
                    );
                    await this.sendDailyRecap(visibleCards, userWithPerimeters.email, emailToPlainText);
                    this.logger.debug('Sent daily recap to user ' + userLogins);
                }
            }
        });
    }
    
    async sendDailyRecap(cards: any, userEmailAdress: string, emailToPlainText: boolean) {
        const emailBody = this.dailyFormat(cards);
        this.mailService.sendMail(this.dailyEmailTitle, emailBody, this.from, userEmailAdress, emailToPlainText);
    }

    dailyFormat(cards: any): string {
        let body = '';
        for (const card of cards) {
            body += this.getFormattedDateAndTimeFromEpochDate(card.startDate) + ' - ';
            if (card.endDate) body += this.getFormattedDateAndTimeFromEpochDate(card.endDate) + ' - ';
            body += card.severity + 
            ' - ' +
            card.titleTranslated +
            '\n';
        }
        return body;
    }
}
