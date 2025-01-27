#!/usr/bin/env bash

# Copyright (c) 2022-2023, RTE (http://www.rte-france.com)
# See AUTHORS.txt
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
# SPDX-License-Identifier: MPL-2.0
# This file is part of the OperatorFabric project.
 
echo "Set mongo version to 4.0-bionic"
sed -i "s/mongo:.*$/mongo:4.0-bionic/g" config/docker/docker-compose.yml