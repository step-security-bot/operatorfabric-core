/* Copyright (c) 2018-2024, RTE (http://www.rte-france.com)
 * Copyright (c) 2020, RTEi (http://www.rte-international.com)
 *  See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */

import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {HttpClientModule, HTTP_INTERCEPTORS} from '@angular/common/http';
import {CommonModule, HashLocationStrategy, LocationStrategy} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AppRoutingModule} from './router/app-routing.module';
import {AppComponent} from './app.component';
import {LoginComponent} from './modules/core/application-loading/login/login.component';
import {TranslateModule} from '@ngx-translate/core';
import {OAuthModule} from 'angular-oauth2-oidc';
import {LoggingModule} from './modules/logging/logging.module';
import {MonitoringModule} from './modules/monitoring/monitoring.module';
import {AdminModule} from './modules/admin/admin.module';
import {CalendarModule} from './modules/calendar/calendar.module';
import {ArchivesModule} from './modules/archives/archives.module';
import {NavbarModule} from './modules/navbar/navbar.module';
import {NgbModalModule, NgbModule} from '@ng-bootstrap/ng-bootstrap';
import {TagInputModule} from 'ngx-chips';
import {TokenInjector} from 'app/server/interceptors.service';
import {ActivityareaModule} from './modules/activityarea/activityarea.module';
import {AlertComponent} from './modules/core/alert/alert.component';
import {ConnectionLostComponent} from './modules/core/connection-lost/connection-lost.component';
import {SoundActivationComponent} from './modules/core/application-loading/sound-activation/sound-activation.component';
import {SessionEndComponent} from './modules/core/session-end/session-end.component';
import {ActivityAreaChoiceAfterLoginComponent} from './modules/core/application-loading/activityarea-choice-after-login/activityarea-choice-after-login.component';
import {AccountAlreadyUsedComponent} from './modules/core/application-loading/account-already-used/account-already-used.component';
import {AppLoadedInAnotherTabComponent} from './modules/core/application-loading/app-loaded-in-another-tab/app-loaded-in-another-tab.component';
import {ApplicationLoadingComponent} from './modules/core/application-loading/application-loading.component';
import {ReloadRequiredComponent} from './modules/core/reload-required/reload-required.component';
import {ServiceWorkerModule, SwRegistrationOptions} from '@angular/service-worker';
import {Utilities} from './business/common/utilities';
import {SpinnerModule} from './modules/share/spinner/spinner.module';
import {UserActionLogsModule} from './modules/useractionlogs/useractionlogs.module';
import {ConfigServer} from './business/server/config.server';
import {AngularConfigServer} from './server/angularConfig.server';
import {ProcessServer} from './business/server/process.server';
import {AngularProcessServer} from './server/angularProcess.server';
import {AngularSettingsServer} from './server/angularSettings.server';
import {AcknowledgeServer} from './business/server/acknowledge.server';
import {AngularAcknowledgeServer} from './server/angularAcknowledgement.server';
import {AngularOpfabEventStreamServer} from './server/angularOpfabEventStream.server';
import {OpfabEventStreamServer} from './business/server/opfabEventStream.server';
import {SettingsServer} from './business/server/settings.server';
import {AngularExternalDevicesServer} from './server/angularExternalDevices.server';
import {ExternalDevicesServer} from './business/server/external-devices.server';
import {RemoteLoggerServer} from './business/server/remote-logger.server';
import {AngularRemoteLoggerServer} from './server/angularRemoteLogger.server';
import {UserActionLogsServer} from './business/server/user-action-logs.server';
import {AngularUserActionLogsServer} from './server/angularUser-Action-Logs.server';
import {EntitiesServer} from './business/server/entities.server';
import {AngularEntitiesServer} from './server/angularEntities.server';
import {PerimetersServer} from './business/server/perimeters.server';
import {AngularPerimetersServer} from './server/angularPerimeters.server';
import {GroupsServer} from './business/server/groups.server';
import {AngularGroupsServer} from './server/angularGroups.server';
import {UserServer} from './business/server/user.server';
import {AngularUserServer} from './server/angularUser.server';
import {AdminProcessServer} from './business/server/adminprocess.server';
import {AngularAdminProcessesServer} from './server/angularAdminProcess.server';
import {TemplateCssServer} from './business/server/template-css.server';
import {AngularTemplateCssServer} from './server/angularTemplate-css.service';
import {AngularCardServer} from './server/angularCard.server';
import {CardServer} from './business/server/card.server';
import {SoundServer} from './business/server/sound.server';
import {AngularSoundServer} from './server/angularSound.server';
import {DashboardModule} from './modules/dashboard/dashboard.module';
import {BusinessDataServer} from './business/server/businessData.server';
import {AngularBusinessDataServer} from './server/angularBusinessData.server';
import {LoadingInProgressComponent} from './modules/core/application-loading/loading-in-progress/loading-in-progress.component';
import {AngularTranslationService} from '@ofServices/angularTranslationService';
import {TranslationService} from './business/services/translation/translation.service';
import {ProcessmonitoringModule} from './modules/processmonitoring/processmonitoring.module';
import {AngularSupervisedEntitiesServer} from './server/angularSupervisedEntities.server';
import {SupervisedEntitiesServer} from './business/server/supervised-entities.server';
import {RichTextModule} from './modules/devtools/richtext/richtext.module';

@NgModule({
    imports: [
        CommonModule,
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        TagInputModule,
        OAuthModule.forRoot(),
        HttpClientModule,
        NgbModule,
        TranslateModule.forRoot(),
        SpinnerModule,
        ArchivesModule,
        LoggingModule,
        MonitoringModule,
        ProcessmonitoringModule,
        DashboardModule,
        NgbModalModule,
        AppRoutingModule,
        AdminModule,
        CalendarModule,
        NavbarModule,
        ActivityareaModule,
        UserActionLogsModule,
        RichTextModule,
        ServiceWorkerModule.register('ngsw-worker.js')
    ],
    declarations: [
        AppComponent,
        LoginComponent,
        AlertComponent,
        ConnectionLostComponent,
        SoundActivationComponent,
        SessionEndComponent,
        ActivityAreaChoiceAfterLoginComponent,
        AccountAlreadyUsedComponent,
        AppLoadedInAnotherTabComponent,
        ApplicationLoadingComponent,
        ReloadRequiredComponent,
        LoadingInProgressComponent
    ],

    providers: [
        {
            provide: SwRegistrationOptions,
            useFactory: () => ({enabled: shallPWAFeatureBeActivated()})
        },
        {provide: LocationStrategy, useClass: HashLocationStrategy},
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TokenInjector,
            multi: true
        },
        {provide: AcknowledgeServer, useClass: AngularAcknowledgeServer},
        {provide: EntitiesServer, useClass: AngularEntitiesServer},
        {provide: SupervisedEntitiesServer, useClass: AngularSupervisedEntitiesServer},
        {provide: PerimetersServer, useClass: AngularPerimetersServer},
        {provide: GroupsServer, useClass: AngularGroupsServer},
        {provide: UserServer, useClass: AngularUserServer},
        {provide: UserActionLogsServer, useClass: AngularUserActionLogsServer},
        {provide: AdminProcessServer, useClass: AngularAdminProcessesServer},
        {provide: RemoteLoggerServer, useClass: AngularRemoteLoggerServer},
        {provide: ConfigServer, useClass: AngularConfigServer},
        {provide: TemplateCssServer, useClass: AngularTemplateCssServer},
        {provide: ProcessServer, useClass: AngularProcessServer},
        {provide: BusinessDataServer, useClass: AngularBusinessDataServer},
        {provide: SettingsServer, useClass: AngularSettingsServer},
        {provide: OpfabEventStreamServer, useClass: AngularOpfabEventStreamServer},
        {provide: ExternalDevicesServer, useClass: AngularExternalDevicesServer},
        {provide: CardServer, useClass: AngularCardServer},
        {provide: SoundServer, useClass: AngularSoundServer},
        {provide: TranslationService, useClass: AngularTranslationService}
    ],
    bootstrap: [AppComponent]
})
export class AppModule {}

export function shallPWAFeatureBeActivated(): boolean {
    const activateSW = Utilities.isNavigatorChromiumBased() && location.href.includes('PWAFeature=true');
    console.log(new Date().toISOString(), 'PWA feature enable : ', activateSW);
    return activateSW;
}
