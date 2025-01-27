/* Copyright (c) 2022-2023, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {OpfabCommands} from './opfabCommands';

export class SettingsCommands extends OpfabCommands {
    constructor() {
        super();
        super.init('SETTINGS');
    }

    clickOnSeverity = function(severity) {
        cy.intercept('PATCH', '/users/**').as('saved');
        cy.get('#opfab-checkbox-setting-form-' + severity).click();
        cy.wait('@saved'); // wait for settings to be saved
    }

    clickOnReplaySound = function () {
        cy.intercept('PATCH', '/users/**').as('saved');
        cy.get('#opfab-checkbox-setting-form-replay').click();
        cy.wait('@saved'); // wait for settings to be saved
    }

    setReplayIntervalTo = function (interval) {
        cy.intercept('PATCH', '/users/**').as('saved');
        cy.get('#opfab-setting-replayInterval').clear();
        cy.wait('@saved'); // wait for settings to be saved
        cy.get('#opfab-setting-replayInterval').type(interval);
        cy.wait('@saved'); // wait for settings to be saved
    }

    clickOnSendNotificationByEmail = function () {
        cy.intercept('PATCH', '/users/**').as('saved');
        cy.get('#opfab-checkbox-setting-form-sendCardsByEmail').click();
        cy.wait('@saved'); // wait for settings to be saved
    }

    setEmailAddress = function (email) {
        cy.intercept('PATCH', '/users/**').as('saved');
        cy.get('#opfab-setting-email').clear();
        cy.wait('@saved'); // wait for settings to be saved
        cy.intercept('PATCH', '/users/**').as('saved2');
        cy.get('#opfab-setting-email').type(email);
        cy.wait('@saved2'); // wait for settings to be saved
    }
}
