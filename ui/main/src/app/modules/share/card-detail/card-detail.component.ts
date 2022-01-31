/* Copyright (c) 2018-2022, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */


import {AfterViewChecked, Component, ElementRef, Input, OnDestroy, OnInit} from '@angular/core';
import {Card} from '@ofModel/card.model';
import {ProcessesService} from '@ofServices/processes.service';
import {HandlebarsService} from '../../cards/services/handlebars.service';
import {DomSanitizer, SafeHtml, SafeResourceUrl} from '@angular/platform-browser';
import {DetailContext} from '@ofModel/detail-context.model';
import {Store} from '@ngrx/store';
import {AppState} from '@ofStore/index';
import {selectAuthenticationState} from '@ofSelectors/authentication.selectors';
import {selectGlobalStyleState} from '@ofSelectors/global-style.selectors';
import {UserContext} from '@ofModel/user-context.model';
import {skip, switchMap, takeUntil} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {UserService} from '@ofServices/user.service';
import {User} from '@ofModel/user.model';
import {EntitiesService} from '@ofServices/entities.service';
import {AppService, PageType} from "@ofServices/app.service";
import {UserPermissionsService} from '@ofServices/user-permissions.service';

declare const templateGateway: any;

@Component({
    selector: 'of-card-detail',
    templateUrl: './card-detail.component.html',
    styleUrls: ['./card-detail.component.scss']
})
export class CardDetailComponent implements OnInit, OnDestroy, AfterViewChecked {

    @Input() card: Card;
    @Input() screenSize: string = 'md';
    @Input() displayContext: any;
    @Input() childCards: Card[] = [];

    public active = false;
    unsubscribe$: Subject<void> = new Subject<void>();
    public hrefsOfCssLink = new Array<SafeResourceUrl>();
    private _htmlContent: SafeHtml;
    private _userContext: UserContext;
    private styles: string[];
    private templateName: string;
    private user: User;
    private userMemberOfAnEntityRequiredToRespondAndAllowedToSendCards = false;


    constructor(private element: ElementRef, private businessconfigService: ProcessesService,
                private handlebars: HandlebarsService, private sanitizer: DomSanitizer,
                private store: Store<AppState>,private userService: UserService, private entitiesService: EntitiesService,
                private userPermissionsService: UserPermissionsService,
                private _appService: AppService) {

        const userWithPerimeters = this.userService.getCurrentUserWithPerimeters();
        if (!!userWithPerimeters) this.user = userWithPerimeters.userData;
        this.store.select(selectAuthenticationState).subscribe(authState => {
            this._userContext = new UserContext(
                authState.identifier,
                authState.token,
                authState.firstName,
                authState.lastName,
                this.user.groups,
                this.user.entities
            );
        });
        this.reloadTemplateWhenGlobalStyleChange();
    }

    ngOnInit() {
        this.computeEntitiesForResponses();
        this.getTemplateAndStyle();
    }

    private computeEntitiesForResponses() {

        let entityIdsRequiredToRespondAndAllowedToSendCards = this.getEntityIdsRequiredToRespondAndAllowedToSendCards();
        const userEntitiesRequiredToRespondAndAllowedToSendCards = entityIdsRequiredToRespondAndAllowedToSendCards.filter(entityId => this.user.entities.includes(entityId));
        this.userMemberOfAnEntityRequiredToRespondAndAllowedToSendCards = userEntitiesRequiredToRespondAndAllowedToSendCards.length > 0;
    }

    private getEntityIdsRequiredToRespondAndAllowedToSendCards() {
        if (!this.card.entitiesRequiredToRespond) return [];
        const entitiesAllowedToRespond = this.entitiesService.getEntitiesFromIds(this.card.entitiesRequiredToRespond);
        return this.entitiesService.resolveEntitiesAllowedToSendCards(entitiesAllowedToRespond).map(entity => entity.id);
    }

    private getTemplateAndStyle() {
        this.businessconfigService.queryProcess(this.card.process, this.card.processVersion)
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe(businessconfig => {
                    if (!!businessconfig) {
                        const state = businessconfig.extractState(this.card);
                        if (!!state) {
                            // Take the first detail, new card preview only compatible with one detail per card
                            this.templateName = state.templateName;
                            this.styles = state.styles;
                        }
                        this.initializeHrefsOfCssLink();
                        this.initializeHandlebarsTemplates();
                    }
                },
                error => console.log(`something went wrong while trying to fetch process for ${this.card.process}`
                    + ` with ${this.card.processVersion} version.`)
            );
    }

    // for certain types of template, we need to reload it to take into account
    // the new css style (for example with chart done with chart.js)
    private reloadTemplateWhenGlobalStyleChange() {
        this.store.select(selectGlobalStyleState)
            .pipe(takeUntil(this.unsubscribe$), skip(1))
            .subscribe(style => this.initializeHandlebarsTemplates());
    }

    private initializeHrefsOfCssLink() {
        if (!!this.styles) {
            const process = this.card.process;
            const processVersion = this.card.processVersion;
            this.hrefsOfCssLink = new Array<SafeResourceUrl>();
            this.styles.forEach(style => {
                const cssUrl = this.businessconfigService.computeBusinessconfigCssUrl(process, style, processVersion);
                // needed to instantiate href of link for css in component rendering
                const safeCssUrl = this.sanitizer.bypassSecurityTrustResourceUrl(cssUrl);
                this.hrefsOfCssLink.push(safeCssUrl);
            });
        }
    }


    private initializeHandlebarsTemplates() {
        templateGateway.initTemplateGateway();

        templateGateway.displayContext =  this.displayContext;
        templateGateway.userMemberOfAnEntityRequiredToRespond = this.userMemberOfAnEntityRequiredToRespondAndAllowedToSendCards;

        templateGateway.childCards = this.childCards;

        this.businessconfigService.queryProcessFromCard(this.card).pipe(
            takeUntil(this.unsubscribe$),
            switchMap(process => {
                return this.handlebars.executeTemplate(this.templateName,
                    new DetailContext(this.card, this._userContext, null));
            })
        )
            .subscribe({
                next: (html) => {
                    this._htmlContent = this.sanitizer.bypassSecurityTrustHtml(html);
                    setTimeout(() => { // wait for DOM rendering
                        this.reinsertScripts();
                        templateGateway.setScreenSize(this.screenSize);
                        templateGateway.applyChildCards();

                        setTimeout(() => templateGateway.onTemplateRenderingComplete(), 10);
                    }, 10);
                },
                error: (error) => {
                    console.log(new Date().toISOString(), 'WARNING impossible to process template ', this.templateName, ":  ", error);
                    this._htmlContent = this.sanitizer.bypassSecurityTrustHtml('');
                }
            });
    }

    get htmlContent() {
        return this._htmlContent;
    }

    reinsertScripts(): void {
        const scripts = <HTMLScriptElement[]>this.element.nativeElement.getElementsByTagName('script');
        Array.prototype.forEach.call(scripts, script => { // scripts.foreach does not work...
            const scriptCopy = document.createElement('script');
            scriptCopy.type = !!script.type ? script.type : 'text/javascript';
            if (!!script.innerHTML) scriptCopy.innerHTML = script.innerHTML;
            scriptCopy.async = false;
            script.parentNode.replaceChild(scriptCopy, script);
        });
    }

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    ngAfterViewChecked() {
        this.adaptTemplateSize();
    }

    private adaptTemplateSize() {
        const cardTemplate = document.getElementById('opfab-card-template-detail');
        if (!!cardTemplate) {
            const diffWindow = cardTemplate.getBoundingClientRect();
            const divBtn = document.getElementById('div-detail-btn');

            let cardTemplateHeight = window.innerHeight - diffWindow.top;
            if (this._appService.pageType !== PageType.FEED) cardTemplateHeight -= 50;

            if (divBtn) {
                cardTemplateHeight -= divBtn.scrollHeight + 15;
            }

            cardTemplate.style.maxHeight = `${cardTemplateHeight}px`;
            cardTemplate.style.overflowX = 'hidden';
        }
    }
}
