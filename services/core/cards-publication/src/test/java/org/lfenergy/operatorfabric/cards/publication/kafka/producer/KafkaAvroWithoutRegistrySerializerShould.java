/* Copyright (c) 2020, Alliander (http://www.alliander.com)
 * See AUTHORS.txt
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * SPDX-License-Identifier: MPL-2.0
 * This file is part of the OperatorFabric project.
 */
package org.lfenergy.operatorfabric.cards.publication.kafka.producer;

import org.apache.kafka.common.errors.SerializationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.lfenergy.operatorfabric.avro.*;
import org.lfenergy.operatorfabric.cards.publication.kafka.consumer.KafkaAvroWithoutRegistryDeserializer;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles(profiles = {"native", "test"})
class KafkaAvroWithoutRegistrySerializerShould {

    @InjectMocks
    KafkaAvroWithoutRegistrySerializer cut;

    @Test
    void serializeRoundTripSuccess() {
        KafkaAvroWithoutRegistryDeserializer deserializer = new KafkaAvroWithoutRegistryDeserializer();
        String topic = "MyTopic";

        Card card = createCard();
        CardCommand cardCommand = createCardCommand(card);

        CardCommand cardCommandRoundTrip = deserializer.deserialize(topic, cut.serialize(topic, cardCommand));
        assertThat(cardCommandRoundTrip, is(cardCommand));
    }

    @Test
    void testFailure() {
        assertThat (cut.serialize("ATopic", null), is(nullValue()));
    }

    @Test
    void testException() {
        CardCommand cardCommand = mock (CardCommand.class);
        assertThrows(SerializationException.class, () -> cut.serialize("Topic", cardCommand));
    }

    private Card createCard() {
        return Card.newBuilder()
                .setPublisher("Publisher")
                .setProcessVersion("ProcessVersion")
                .setStartDate(12345L)
                .setSeverity(SeverityType.ALARM)
                .setTitle(new I18n("Title", null))
                .setSummary(new I18n("Summary", null))
                .build();
    }

    private CardCommand createCardCommand(Card card) {
        return CardCommand.newBuilder()
                .setCommand(CommandType.CREATE_CARD)
                .setProcess("Process")
                .setProcessInstanceId("InstanceId")
                .setCard(card)
                .build();
    }
}
