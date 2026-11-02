#!/usr/bin/env python3
"""Genere src/components/ui/lucide.ts a partir du paquet officiel lucide-static (licence ISC).

Ajouter une icone : l'ajouter a ICONS ci-dessous (cle du panel -> nom de fichier Lucide), puis
    cd /tmp && npm pack lucide-static && tar xzf lucide-static-*.tgz
    python3 scripts/lucide-icons.py /tmp/package
Le paquet n'est pas installe dans le projet : seuls les traces des icones utilisees sont copies.
"""
import json
import re
import sys
from pathlib import Path

ICONS = {
    'add': 'plus', 'activity': 'activity', 'apps': 'layout-grid', 'arrowUp': 'arrow-up', 'bot': 'bot',
    'branch': 'git-branch', 'chart': 'chart-line', 'check': 'check', 'clipboard': 'clipboard-paste', 'copy': 'copy',
    'cube': 'box', 'dismiss': 'x', 'download': 'download', 'file': 'file', 'folder': 'folder',
    'folderPlus': 'folder-plus', 'gauge': 'gauge', 'hardDrive': 'hard-drive', 'info': 'info', 'menu': 'menu',
    'message': 'message-square-text', 'moon': 'moon', 'network': 'network', 'open': 'external-link',
    'palette': 'palette', 'panel': 'panel-left', 'pencil': 'pencil', 'refresh': 'refresh-cw', 'scissors': 'scissors',
    'search': 'search', 'send': 'send', 'server': 'server', 'settings': 'settings', 'spark': 'sparkles',
    'stop': 'square', 'sun': 'sun', 'terminal': 'square-terminal', 'trash': 'trash-2', 'upload': 'upload',
    'users': 'users', 'warning': 'triangle-alert',
    'dashboard': 'layout-dashboard', 'cpu': 'cpu', 'logs': 'scroll-text', 'puzzle': 'puzzle', 'waypoints': 'waypoints',
    'shield': 'shield-check', 'panelLeft': 'panel-left', 'chevronDown': 'chevron-down', 'chevronRight': 'chevron-right',
    'monitor': 'monitor', 'store': 'store', 'house': 'house', 'clipboardList': 'clipboard-list', 'logout': 'log-out', 'circleCheck': 'circle-check', 'circleX': 'circle-x',
    'circleAlert': 'circle-alert', 'play': 'play', 'restart': 'rotate-ccw', 'power': 'power', 'console': 'terminal',
    'loader': 'loader-circle', 'memory': 'memory-stick', 'globe': 'globe', 'key': 'key-round', 'user': 'user-round',
    'clock': 'clock', 'more': 'ellipsis', 'arrowLeft': 'arrow-left', 'arrowRight': 'arrow-right', 'database': 'database', 'zap': 'zap',
    'filter': 'funnel', 'eye': 'eye', 'box': 'package', 'wrench': 'wrench', 'link': 'link', 'list': 'list',
    'pause': 'pause', 'layers': 'layers',
    'inbox': 'inbox', 'keyboard': 'keyboard', 'command': 'command', 'enter': 'corner-down-left',
    'arrowDown': 'arrow-down', 'arrowUpDown': 'arrow-up-down', 'chevronLeft': 'chevron-left', 'chevronUp': 'chevron-up',
    'theme': 'sun-moon',
    'mail': 'mail', 'paperclip': 'paperclip', 'star': 'star', 'reply': 'reply', 'replyAll': 'reply-all',
    'forward': 'forward', 'archive': 'archive', 'spam': 'octagon-alert',
}

src = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/package') / 'icons'
version = json.loads((src.parent / 'package.json').read_text())['version']
out = []
for key, name in ICONS.items():
    svg = (src / f'{name}.svg').read_text()
    body = svg[svg.index('>', svg.index('<svg')) + 1: svg.rindex('</svg>')]
    body = re.sub(r'\s+', ' ', body).replace(' />', '/>').replace('> <', '><').strip()
    out.append(f"  {key}: '{body}',")

Path('src/components/ui/lucide.ts').write_text(
    f"""// Icônes Lucide (https://lucide.dev), licence ISC, lucide-static {version}.
export const LUCIDE = {{
{chr(10).join(out)}
}} as const;

export type IconName = keyof typeof LUCIDE;
"""
)
print(f'{len(out)} icones -> src/components/ui/lucide.ts (lucide-static {version})')
