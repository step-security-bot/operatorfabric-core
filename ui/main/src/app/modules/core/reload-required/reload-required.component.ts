/* Copyright (c) 2022, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {LogOption, OpfabLoggerService} from '@ofServices/logs/opfab-logger.service';
import {selectRelodRequested} from '@ofStore/selectors/cards-subscription.selectors';


@Component({
    selector: 'of-reload-required',
    styleUrls: ['./reload-required.component.scss'],
    templateUrl: './reload-required.component.html'
})
export class ReloadRequiredComponent implements OnInit {
    displayReloadRequired: boolean;

    constructor(
        private store: Store,
        private logger: OpfabLoggerService
    ) {}

    ngOnInit(): void {
        this.detectReloadRequested();
    }

    private detectReloadRequested() {
        this.store.select(selectRelodRequested).subscribe((reloadRequested) => {
            if (reloadRequested) {
                this.logger.info('Application reload requested', LogOption.LOCAL_AND_REMOTE);
                this.displayReloadRequired = true;

            }
        });
    }

    public hide() {
        this.displayReloadRequired = false;
    }

    public reload() {
        location.reload();
    }

}
