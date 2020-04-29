/*********************************************************************************************************************
 *  Copyright 2019 Ndevr, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const Generate = require('./generate.js');

exports.handler = async (event) => {

    // console.log(event);
    let response;
    if (event.httpMethod == 'POST') {
        if (event.path = '/generate') {
            const generate = new Generate();

            response = await generate.process(event);
        }
    } else {
        response = "Invalid request."
    }
    return response;
};
