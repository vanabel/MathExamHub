#!/bin/bash
# 前端启动脚本，用于 PM2
# 避免 PM2 传参时导致参数解析问题

cd "$(dirname "$0")/frontend" || exit 1
exec serve -s dist --listen=19896
