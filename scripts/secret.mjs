#!/usr/bin/env node
// Prints a new random JWT_SECRET (48 random bytes, base64). Paste it into .env.
import { generateJwtSecret } from "./lib/env.mjs";

console.log(generateJwtSecret());
