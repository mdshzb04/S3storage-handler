import "dotenv/config"
import { S3 } from 'aws-sdk';
import fs from "fs";
import path from "path";

const s3 = new S3({
  accessKeyId: process.env.ACCESS_KEY_ID || "your-aws-access-key",
  secretAccessKey: process.env.SECRECT_ACCESS_KEY || "your-aws-secret",
  endpoint: process.env.ENDPOINT || "your-endpoint",
});

export async function downloadS3Folder(prefix: string) {
    // Normalize prefix: remove leading slashes
    const normalizedPrefix = prefix.replace(/^\/+/, "");

    // Ensure base directory exists even if there are no files
    const baseDir = path.join(__dirname, normalizedPrefix);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    const allFiles = await s3.listObjectsV2({
        Bucket: "vercel1",
        Prefix: normalizedPrefix
    }).promise();
    
    const allPromises = allFiles.Contents?.map(async ({ Key }) => {
        return new Promise(async (resolve) => {
            if (!Key || Key.endsWith("/")) {
                resolve("");
                return;
            }
            const finalOutputPath = path.join(__dirname, Key);
            const dirName = path.dirname(finalOutputPath);
            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }
            const outputFile = fs.createWriteStream(finalOutputPath);
            s3.getObject({
                Bucket: "vercel1",
                Key
            }).createReadStream().pipe(outputFile).on("finish", () => {
                resolve("");
            });
        });
    }) || [];
    console.log("awaiting");

    await Promise.all(allPromises?.filter(x => x !== undefined));
}

export function copyFinalDist(id: string) {
    const folderPath = path.join(__dirname, `output/${id}/dist`);
    if (!fs.existsSync(folderPath)) {
        console.log(`skip: build output not found at ${folderPath}`);
        return;
    }
    const allFiles = getAllFiles(folderPath);
    allFiles.forEach(file => {
        uploadFile(`dist/${id}/` + file.slice(folderPath.length + 1), file);
    })
}

const getAllFiles = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFiles(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}

const uploadFile = async (fileName: string, localFilePath: string) => {
    const fileContent = fs.readFileSync(localFilePath);
    const response = await s3.upload({
        Body: fileContent,
        Bucket: "vercel1",
        Key: fileName,
    }).promise();
    console.log(response);
}
