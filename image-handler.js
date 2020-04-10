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

class ImageHandler {

    /**
     * Main method for processing S3 update events.
     * @param {Event} event - An Event object.
     */
    async process(event) {

        this.bucket = event.Records[0].s3.bucket.name;
        this.setSources();
        // Object key may have spaces or unicode non-ASCII characters.
        this.key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
        this.setMainSize();
        this.setSizes();

        if (false !== this.mainSize) {
            console.log("is main: yes - " + this.mainSize);
            await this.resizeImages();
        } else {
            console.log("is main: no");
            // Do nothing
            return;
        }

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

    setSources() {
        const config = require('./config.json');
        let sources = [];

        if ("object" === typeof config.buckets) {
            try {
                sources = config.buckets[this.bucket]['sources'];
            } catch (err) {
                console.log(err, err.stack);
                console.log(config.buckets);
            }
        }

        this.sources = sources;
    }

    setSizes() {
        const config = require('./config.json');
        let sizes = [];

        if ("object" === typeof config.buckets) {
            try {
                sizes = config.buckets[this.bucket]['sources'][this.mainSize];
            } catch (err) {
                console.log(err, err.stack);
            }
        }

        this.sizes = sizes;
    }

    getSizeName(size) {
        return size[0] + 'x' + size[1];
    }

    async uploadImage(contentType, buffer, size) {
        console.log("uploading...");

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
                ContentType: contentType,
                ACL: 'public-read'
            },
            function (err) {
                if (err) {
                    console.log(err, err.stack);
                }
            }).promise();
    }

    async resizeImage(response, size) {
        console.log("resizeImage...");

        // Transform the image buffer in memory.
        let buffer = await sharp(response.Body)
            .resize(size[0], size[1])
            .toBuffer();
        await this.uploadImage(response.ContentType, buffer, size);

    }

    async resizeImages() {
        console.log("resizeImages...");

        const response = await s3.getObject({
            Bucket: this.bucket,
            Key: this.key
        }).promise();

        for (let size of this.sizes) {
            await this.resizeImage(response, size);
        }

    }

}

// Exports
module.exports = ImageHandler;
