/* Copyright (c) 2023-2024, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import 'jest';
import sinon from 'sinon';
import Logger from '../src/common/server-side/logger';
import CardsExternalDiffusionOpfabServicesInterface from '../src/domain/server-side/cardsExternalDiffusionOpfabServicesInterface';



function getOpfabServicesInterface() {
    return new CardsExternalDiffusionOpfabServicesInterface()
        .setLogin('test')
        .setPassword('test')
        .setOpfabGetTokenUrl('tokenurl')
        .setOpfabUsersUrl('test')
        .setOpfabCardsConsultationUrl('test')
        .setLogger(logger);
}

const logger = Logger.getLogger();

describe('Opfab interface', function () {
    it('Should get one user login when one user connected ', async function () {
        
        
        const opfabServicesInterface = getOpfabServicesInterface();

        sinon.stub(opfabServicesInterface, 'sendRequest').callsFake((request) => {
            if (request.url.includes('token')) return Promise.resolve({status: 200, data: {access_token: 'fakeToken'}});
            else {
                if (request.headers?.Authorization?.includes('Bearer fakeToken'))
                    return Promise.resolve({status: 200, data: [{login: 'user1'}]});
                else return Promise.resolve({status: 400});
            }
        });
        const users = await opfabServicesInterface.getUsersConnected();
        expect(users.getData().length).toEqual(1);
    });

    it('Should return invalid response when impossible to authenticate to opfab ', async function () {
        const opfabServicesInterface = getOpfabServicesInterface();
        sinon.stub(opfabServicesInterface, 'sendRequest').callsFake((request: any) => {
            return Promise.reject(new Error('test'));
        });
        const GetResponse = await opfabServicesInterface.getUsersConnected();
        expect(GetResponse.isValid()).toBe(false);
    });

    it('Should return invalid reponse  when error in user request ', async function () {
        const opfabServicesInterface = getOpfabServicesInterface();
        sinon.stub(opfabServicesInterface, 'sendRequest').callsFake((request) => {
            if (request.url.includes('token')) return Promise.resolve({status: 200, data: {access_token: 'fakeToken'}});
            else return Promise.reject(new Error('error message'));
        });
        const GetResponse = await opfabServicesInterface.getUsersConnected();
        expect(GetResponse.isValid()).toBe(false);
    });
});
