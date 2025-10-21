
import { createClient, commandOptions } from "redis";
import { copyFinalDist, downloadS3Folder } from "./aws";
import { buildProject } from "./utils";
const subscriber = createClient();
subscriber.connect();

const publisher = createClient();
publisher.connect();

async function main() {
    while(1) {
        const res = await subscriber.brPop(
            commandOptions({ isolated: true }),
            'build-queue',
            0
          );
        // @ts-ignore;
        const id = res.element;

        try {
            await publisher.hSet("status", id, "building")
            await downloadS3Folder(`output/${id}`)
            const ok = await buildProject(id);
            if (!ok) {
                await publisher.hSet("status", id, "failed");
                continue;
            }
            copyFinalDist(id);
            await publisher.hSet("status", id, "deployed")
        } catch (err) {
            await publisher.hSet("status", id, "failed");
        }
    }
}
main();
