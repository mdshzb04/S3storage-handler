import { exec, spawn } from "child_process";
import path from "path";
import fs from "fs";

export function buildProject(id: string): Promise<boolean> {
    return new Promise((resolve) => {
        const projectDir = path.join(__dirname, `output/${id}`);
        if (!fs.existsSync(projectDir)) {
            console.log(`skip: project directory not found at ${projectDir}`);
            resolve(false);
            return;

            
        }
        const child = exec(`cd ${projectDir} && npm install --yes && npm run -s build`)

        child.stdout?.on('data', function(data) {
            console.log('stdout: ' + data);
        });
        child.stderr?.on('data', function(data) {
            console.log('stderr: ' + data);
        });

        child.on('close', function(code) {
           resolve(code === 0)
        });

    })

}