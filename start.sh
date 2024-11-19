#!/bin/bash
until npm run start; do
    echo "Server 'npm run start' crashed with exit code $?. Respawning.." >&2
    sleep 1
done

