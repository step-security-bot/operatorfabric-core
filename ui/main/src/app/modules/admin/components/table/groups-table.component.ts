/*
 * Copyright (c) 2021-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {AdminTableDirective, Field} from './admin-table.directive';
import {AdminItemType} from '../../services/sharing.service';
import {EditGroupModalComponent} from '../editmodal/groups/edit-group-modal.component';
import {ActionButton} from '../cell-renderers/action-cell-renderer.component';

@Component({
    templateUrl: 'admin-table.directive.html',
    selector: 'of-groups-table',
    styleUrls: ['admin-table.directive.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GroupsTableComponent extends AdminTableDirective implements OnInit {
    tableType = AdminItemType.GROUP;
    fields = [
        new Field('id', 4, 'idCellRenderer'),
        new Field('name', 6),
        new Field('description', 5),
        new Field('perimeters', 8, 'perimetersCellRenderer'),
        new Field('permissions', 6, 'arrayCellRenderer'),
        new Field('realtime', 3, null, this.translateValue, 'realtimeColumn')
    ];
    idField = 'id';
    actionButtonsDisplayed = [ActionButton.EDIT, ActionButton.DELETE];
    editModalComponent = EditGroupModalComponent;

    ngOnInit() {
        this.gridOptions.columnTypes['realtimeColumn'] = {
            sortable: true,
            filter: 'agTextColumnFilter',
            wrapText: true,
            autoHeight: true,
            flex: 4,
            resizable: false
        };
        super.initCrudService();
    }
}
