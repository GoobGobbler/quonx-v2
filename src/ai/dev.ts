import { config } from 'dotenv';
config();

import '@/ai/flows/generate-code-from-prompt.ts';
import '@/ai/flows/incorporate-successful-code.ts';