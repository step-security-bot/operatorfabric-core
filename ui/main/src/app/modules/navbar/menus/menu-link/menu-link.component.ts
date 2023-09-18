/* Copyright (c) 2018-2023, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {Component, Input} from '@angular/core';
import {Router} from '@angular/router';
import {CustomMenu, MenuEntryLinkTypeEnum} from '@ofModel/menu.model';
import {GlobalStyleService} from 'app/business/services/global-style.service';

@Component({
    selector: 'of-menu-link',
    templateUrl: './menu-link.component.html',
    styleUrls: ['./menu-link.component.scss']
})
export class MenuLinkComponent {
    @Input() public menu: CustomMenu;
    @Input() public menuEntry: any;
    @Input() public currentRoute: string;

    constructor(private router: Router, private globalStyleService: GlobalStyleService) {}

    LinkType = MenuEntryLinkTypeEnum;

    public hasLinkType(type: MenuEntryLinkTypeEnum): boolean {
        return !!this.menuEntry.customMenuId && this.menuEntry.linkType === type;
    }

    public isLinkACoreMenu(): boolean {
        return !!this.menuEntry.opfabCoreMenuId;
    }

    goToLink() {
        // WARNING : HACK
        //
        // When user makes a reload (for example via F5) or use a bookmark link, the browser encodes what is after #
        // if user makes a second reload, the browser encodes again the encoded link
        // and after if user reload again, this time it is not encoded anymore by the browser
        // So it ends up with 3 possible links: a none encoded link, an encoded link or a twice encoding link
        // and we have no way to know which one it is when processing the url
        //
        // To solve the problem we encode two times the url before giving it to the browser
        // so we always have a unique case : a double encoded url
        this.router.navigate([
            '/businessconfigparty/' +
                encodeURIComponent(encodeURIComponent(this.menu.id)) +
                '/' +
                encodeURIComponent(encodeURIComponent(this.menuEntry.customMenuId)) +
                '/'
        ]);
    }

    addOpfabThemeParamToUrl(url: string): string {
        return this.addParamsToUrl(url, 'opfab_theme=' + this.globalStyleService.getStyle());
    }

    private addParamsToUrl(url, params) {
        let newUrl = url;
        if (params) {
            newUrl += url.includes('?') ? '&' : '?';
            newUrl += params;
        }
        return newUrl;
    }
}
