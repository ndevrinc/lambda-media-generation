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
        let update_response;
        try {
            if (event.body !== null && event.body !== undefined) {
                this.initVars(event);

                if (false !== this.mainSize) {
                    console.log("is main: yes - " + this.mainSize);

                    const response = await s3.getObject({
                        Bucket: this.bucket,
                        Key: this.key
                    }).promise();

                    this.contentType = response.ContentType;
                    this.responseBody = response.Body;

                    await this.resizeImages();

                    console.log("Sending attachments update to WordPress");
                    const options = {
                        hostname: this.hostname,
                        port: 443,
                        path: this.path + "?aid=" + this.aid + "&key=" + this.key + "&api_key=" + this.update_key,
                        method: 'GET'
                    };
                    const req = await https.get(options, resp => {
                        console.log(`statusCode: ${resp.statusCode}`);

                        resp.on('data', chunk => {
                            console.log(chunk);
                        });

                    });

                    req.on("error", err => {
                        console.log("Error: " + err.message);
                    });
                } else {
                    console.log("is main: no");
                    // Do nothing
                    return;
                }
            }

            response = {
                'statusCode': 200,
                'body': JSON.stringify({
                    message: 'Media Resized, Updated: ' + update_response,
                })
            }
        } catch (err) {
            console.log(err);
            return err;
        }

        return response;

    }

    setMainSize() {
        const imageObj = path.parse(this.key);
        const imageName = imageObj['name'];
        let sizeName = '';

        for (let [sourceName, sizes] of Object.entries(this.sources)) {

            // Simple check for non full images
            if ("full" !== sourceName && imageName.endsWith(sourceName)) {
                this.mainSize = sourceName;
                return;
            }

            // The "full" image string is technically an empty size so it is a bit more complicated
            if ("full" === sourceName) {
                for (let size of sizes) {
                    sizeName = this.getSizeName(size);

                    // For "full" check each individual generated size
                    if (imageName.endsWith(sizeName)) {
                        this.mainSize = false;
                        return;
                    }
                }
                this.mainSize = "full";
                return;
            }

        }

        this.mainSize = false;
    }

    initVars(event) {
        const config = require('./config.json');
        this.bucket = "";
        this.key = "";
        this.aid = null;
        this.sources = [];
        this.sizes = [];
        this.update_url = "";
        this.update_key = "";

        let body = JSON.parse(event.body);
        this.bucket = body.bucket;
        this.aid = body.aid;
        // Object key may have spaces or unicode non-ASCII characters.
        this.key = body.key.replace(/\+/g, " ");


        if ("object" === typeof config.buckets) {
            try {
                this.sources = config.buckets[this.bucket]['sources'];
                this.setMainSize();
                this.sizes = config.buckets[this.bucket]['sources'][this.mainSize];
                this.hostname = config.buckets[this.bucket]['hostname'];
                this.path = config.buckets[this.bucket]['path'];
                this.update_key = config.buckets[this.bucket]['update_key'];
            } catch (err) {
                console.log(err, err.stack);
                console.log(config.buckets);
            }
        }
    }

    getSizeName(size) {
        return size[0] + 'x' + size[1];
    }

    async uploadImage(buffer, size) {
        let width = size[0];
        let height = size[1];
        let crop = size[2];
        console.log("uploading - "+width+"x"+height+"-"+crop);

        const imageObj = path.parse(this.key);
        let sizeKey = imageObj["name"] + '-' + this.getSizeName(size) + imageObj["ext"];
        if ( "dir" in imageObj ) {
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
        console.log("resizeImage - "+width+"x"+height+"-"+fit);

        // Transform the image buffer in memory.
        let data = await sharp(this.responseBody)
            .resize({ width: width, height: height, fit: fit})
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

}

// Exports
module.exports = Generate;
