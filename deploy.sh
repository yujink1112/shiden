#!bin/bash
GENERATE_SOURCEMAP=false npm run build && firebase deploy --only hosting