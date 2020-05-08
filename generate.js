/*********************************************************************************************************************
 *  Copyright 2020 Ndevr, Inc. or its affiliates. All Rights Reserved.                                           *
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

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const path = require('path');
const sharp = require('sharp');
const https = require('https');

class Generate {

    /**
     * Main method for processing S3 update events.
     * @param {Event} event - An Event object.
     */
    async process(event) {

        let response;
        try {
            if (event.body !== null && event.body !== undefined) {
                if (this.initVars(event)) {

                    const s3_response = await s3.getObject({
                        Bucket: this.bucket,
                        Key: this.key
                    }).promise();

                    this.contentType = s3_response.ContentType;
                    this.responseBody = s3_response.Body;

                    await this.resizeImages();

                    console.log("Sending attachments update to WordPress");
                    const options = {
                        hostname: this.hostname,
                        port: 443,
                        path: this.path + "?aid=" + this.aid + "&key=" + this.key + "&api_key=" + this.api_key,
                        method: 'GET'
                    };
                    await this.httpsRequest(options).then(function (body) {
                        console.log(body);
                    });
                    response = {
                        'statusCode': 200,
                        'body': JSON.stringify({
                            message: 'Media Resized.',
                        })
                    }
                } else {
                    response = {
                        'statusCode': 400,
                        'body': JSON.stringify({
                            message: 'Error, see logs',
                        })
                    }
                }

            }

        } catch (err) {
            console.log(err);
            response = {
                'statusCode': 400,
                'body': JSON.stringify({
                    message: 'Error, see logs',
                })
            }
        }

        return response;

    }

    initVars(event) {
        const config = require('./config.json');

        let body = JSON.parse(event.body);
        this.api_key = body.api_key;
        this.bucket = body.bucket;


        if ("object" === typeof config.buckets) {
            try {
                // Check API Key
                if (this.api_key !== config.buckets[this.bucket]['api_key']) {
                    console.log("api_key did not match!");
                    return false;
                }

                this.aid = body.aid;
                // Object key may have spaces or unicode non-ASCII characters.
                this.key = body.key.replace(/\+/g, " ");
                this.sizes = JSON.parse(body.sizes);
                this.hostname = body.hostname;
                this.path = body.path;
            } catch (err) {
                console.log(err, err.stack);
            }
        }

        return true;
    }

    getSizeName(size) {
        return size[0] + 'x' + size[1];
    }

    async uploadImage(buffer, size) {
        let width = size[0];
        let height = size[1];
        let crop = size[2];
        console.log("uploading - " + width + "x" + height + "-" + crop);

        const imageObj = path.parse(this.key);
        let sizeKey = imageObj["name"] + '-' + this.getSizeName(size) + imageObj["ext"];
        if ("dir" in imageObj) {
            sizeKey = imageObj["dir"] + '/' + sizeKey;
        }

        // Stream the transformed image to the same S3 bucket.
        await s3.putObject({
                Bucket: this.bucket,
                Key: sizeKey,
                Body: buffer,
                ACL: 'public-read',
                ContentType: this.contentType
            },
            function (err) {
                if (err) {
                    console.log(err, err.stack);
                }
            }).promise();
    }

    async resizeImage(size) {
        let width = size[0];
        let height = size[1];
        let crop = size[2];
        let fit = "cover"
        if (size[1] === 0) {
            height = 9999;
        }

        if (crop || height === 9999) {
            fit = "inside";
        }
        console.log("resizeImage - " + width + "x" + height + "-" + fit);

        // Transform the image buffer in memory.
        let data = await sharp(this.responseBody)
            .resize({width: width, height: height, fit: fit})
            .toBuffer()
            .catch((err, data, info) => {
                console.log(err, err.stack);
                console.log(info);
            });
        await this.uploadImage(data, size);
    }

    async resizeImages() {
        console.log("resizeImages...");

        try {

            const listOfPromises = this.sizes.map(this.resizeImage, this);

            await Promise.all(listOfPromises);

        } catch (err) {
            console.log(err, err.stack);
        }
    }

    httpsRequest(params) {
        return new Promise(function (resolve, reject) {
            const req = https.get(params, function (resp) {
                console.log(`statusCode: ${resp.statusCode}`);

                resp.on('end', function () {
                    resolve("Update Complete");
                })

            });

        })
    }
}

// Exports
module.exports = Generate;
