/* Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Card} from '@ofModel/card.model';
import {ProcessesService} from 'app/business/services/businessconfig/processes.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {State} from '@ofModel/processes.model';
import {NgbModal, NgbModalOptions, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import {SelectedCard, SelectedCardService} from 'app/business/services/card/selectedCard.service';
import {Router} from '@angular/router';
import {LoggerService} from 'app/business/services/logs/logger.service';

@Component({
    selector: 'of-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit, OnDestroy {
    @Input() parentModalRef: NgbModalRef;
    @Input() screenSize = 'md';

    modalRef: NgbModalRef;
    @ViewChild('cardDeleted') cardDeleted: ElementRef;

    card: Card;
    childCards: Card[];
    cardState: State;
    unsubscribe$: Subject<void> = new Subject<void>();
    cardLoadingInProgress = false;
    cardNotFound = false;
    currentSelectedCardId: string;
    detailClosed: boolean;

    constructor(
        protected modalService: NgbModal,
        protected router: Router
    ) {}

    ngOnInit() {
        SelectedCardService.getSelectCard()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((selectedCard: SelectedCard) => {
                if (selectedCard.card) {
                    this.cardNotFound = false;
                    ProcessesService.queryProcess(
                        selectedCard.card.process,
                        selectedCard.card.processVersion
                    ).subscribe({
                        next: (businessconfig) => {
                            this.card = selectedCard.card;
                            this.childCards = selectedCard.childCards;
                            this.cardLoadingInProgress = false;
                            if (businessconfig) {
                                this.cardState = businessconfig.states.get(selectedCard.card.state);
                                if (!this.cardState) {
                                    LoggerService.warn(
                                        `State ${selectedCard.card.state} does not exist for process ${selectedCard.card.process}`
                                    );
                                    this.cardState = new State();
                                }
                            } else {
                                this.cardState = new State();
                            }
                        }
                    });
                } else {
                    if (selectedCard.notFound) {
                        this.cardNotFound = true;
                        this.cardLoadingInProgress = false;
                        LoggerService.warn('Card not found.');
                    }
                }
            });
        this.checkForCardLoadingInProgressForMoreThanOneSecond();
        this.checkForCardDeleted();
    }

    // we show a spinner on screen if card loading takes more than 1 second
    checkForCardLoadingInProgressForMoreThanOneSecond() {
        SelectedCardService.getSelectCardIdChanges()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((cardId) => {
                // a new card has been selected and will be downloaded
                //this.cardNotFound = false;
                this.currentSelectedCardId = cardId;
                setTimeout(() => {
                    if (SelectedCardService.isSelectedCardNotFound()) {
                        this.cardLoadingInProgress = false;
                        return;
                    }
                    // the selected card has not changed in between
                    if (this.currentSelectedCardId === cardId) {
                        if (!this.card) this.cardLoadingInProgress = !!this.currentSelectedCardId;
                        else this.cardLoadingInProgress = this.card.id !== this.currentSelectedCardId;
                    }
                }, 1000);
            });
    }

    checkForCardDeleted() {
        SelectedCardService.getSelectedCardsDeleted()
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((cardId) => {
                setTimeout(() => {
                    if (!this.detailClosed) {
                        const modalOptions: NgbModalOptions = {
                            centered: true,
                            backdrop: 'static', // Modal shouldn't close even if we click outside it
                            size: 'sm'
                        };
                        this.modalRef = this.modalService.open(this.cardDeleted, modalOptions);

                        // Close card detail modal is dismissed by pressing escape key
                        this.modalRef.dismissed.subscribe(() => {
                            this.modalRef = null;
                            this.closeDeletedCard();
                        });
                    }
                }, 500);
            });
    }

    closeDeletedCard() {
        this.closeDetails();

        if (this.parentModalRef) {
            this.parentModalRef.close();
            SelectedCardService.clearSelectedCardId();
        } else {
            SelectedCardService.clearSelectedCardId();
            this.router.navigate(['/feed']);
        }
    }

    closeDetails() {
        this.detailClosed = true;
        if (this.modalRef) this.modalRef.dismiss();
    }

    public isSmallscreen() {
        return window.innerWidth < 1000;
    }

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }
}
