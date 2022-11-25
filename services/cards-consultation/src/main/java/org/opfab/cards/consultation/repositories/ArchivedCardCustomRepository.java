/* Copyright (c) 2018-2022, RTE (http://www.rte-france.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */


package org.opfab.cards.consultation.repositories;

import org.opfab.cards.consultation.model.ArchivedCardConsultationData;
import org.opfab.cards.consultation.model.ArchivedCardsFilter;
import org.opfab.cards.consultation.model.LightCard;
import org.opfab.users.model.CurrentUserWithPerimeters;
import org.springframework.data.domain.Page;
import org.springframework.util.MultiValueMap;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

public interface ArchivedCardCustomRepository extends UserUtilitiesCommonToCardRepository<ArchivedCardConsultationData> {

    Mono<Page<LightCard>> findWithUserAndParams(Tuple2<CurrentUserWithPerimeters,MultiValueMap<String, String>> params);
    Flux<ArchivedCardConsultationData> findByParentCard(ArchivedCardConsultationData parent);
    Mono<Page<LightCard>> findWithUserAndFilter(Tuple2<CurrentUserWithPerimeters, ArchivedCardsFilter> filter);
}
