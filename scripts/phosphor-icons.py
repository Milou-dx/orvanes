#!/usr/bin/env python3
"""Genere src/components/ui/glyphs.ts (graisse Bold) et glyphs-duotone.ts (graisse Duotone, tuiles du Dock)
a partir du paquet officiel @phosphor-icons/core (licence MIT).

Ajouter une icone : l'ajouter a ICONS ci-dessous (cle du panel -> nom de fichier Phosphor, sans « -bold »), puis
    cd "$(mktemp -d)" && npm pack @phosphor-icons/core && tar xzf phosphor-icons-core-*.tgz
    python3 scripts/phosphor-icons.py <ce dossier>/package
Le paquet n'est pas installe dans le projet : seuls les traces des icones utilisees sont copies.
"""
import json
import re
import sys
from pathlib import Path

ICONS = {
    'add': 'plus', 'activity': 'pulse', 'apps': 'squares-four', 'arrowUp': 'arrow-up', 'bot': 'robot',
    'branch': 'git-branch', 'chart': 'chart-line', 'check': 'check', 'clipboard': 'clipboard-text', 'copy': 'copy',
    'cube': 'cube', 'dismiss': 'x', 'download': 'download-simple', 'file': 'file', 'fileText': 'file-text',
    'fileCode': 'file-code', 'image': 'image', 'film': 'film-strip', 'music': 'music-notes', 'save': 'floppy-disk',
    'maximize': 'arrows-out', 'folder': 'folder', 'folderPlus': 'folder-plus', 'gauge': 'gauge',
    'hardDrive': 'hard-drive', 'info': 'info', 'menu': 'list', 'help': 'question', 'message': 'chat-text',
    'moon': 'moon', 'network': 'network', 'open': 'arrow-square-out', 'palette': 'palette', 'panel': 'sidebar-simple',
    'pencil': 'pencil-simple', 'refresh': 'arrows-clockwise', 'scissors': 'scissors', 'search': 'magnifying-glass',
    'send': 'paper-plane-tilt', 'server': 'hard-drives', 'settings': 'gear', 'spark': 'sparkle', 'stop': 'square',
    'sun': 'sun', 'terminal': 'terminal-window', 'trash': 'trash', 'upload': 'upload-simple', 'users': 'users',
    'warning': 'warning', 'dashboard': 'layout', 'cpu': 'cpu', 'logs': 'scroll', 'puzzle': 'puzzle-piece',
    'waypoints': 'graph', 'shield': 'shield-check', 'panelLeft': 'sidebar-simple', 'chevronDown': 'caret-down',
    'chevronRight': 'caret-right', 'monitor': 'monitor', 'store': 'storefront', 'house': 'house',
    'clipboardList': 'list-checks', 'logout': 'sign-out', 'circleCheck': 'check-circle', 'circleX': 'x-circle',
    'circleAlert': 'warning-circle', 'play': 'play', 'restart': 'arrow-counter-clockwise', 'power': 'power',
    'console': 'terminal', 'loader': 'circle-notch', 'memory': 'memory', 'globe': 'globe', 'key': 'key',
    'user': 'user', 'clock': 'clock', 'more': 'dots-three', 'arrowLeft': 'arrow-left', 'arrowRight': 'arrow-right',
    'database': 'database', 'zap': 'lightning', 'filter': 'funnel', 'eye': 'eye', 'box': 'package',
    'wrench': 'wrench', 'link': 'link', 'list': 'list-bullets', 'pause': 'pause', 'layers': 'stack',
    'inbox': 'tray', 'keyboard': 'keyboard', 'command': 'command', 'enter': 'arrow-elbow-down-left',
    'arrowDown': 'arrow-down', 'arrowUpDown': 'arrows-down-up', 'chevronLeft': 'caret-left', 'chevronUp': 'caret-up',
    'theme': 'circle-half', 'mail': 'envelope-simple', 'paperclip': 'paperclip', 'star': 'star',
    'reply': 'arrow-bend-up-left', 'replyAll': 'arrow-bend-double-up-left', 'forward': 'arrow-bend-up-right',
    'archive': 'archive', 'spam': 'warning-octagon',
}

package = Path(sys.argv[1])
version = json.loads((package / 'package.json').read_text())['version']
out = []
for key, name in ICONS.items():
    svg = (package / 'assets' / 'bold' / f'{name}-bold.svg').read_text()
    paths = re.findall(r'<path d="([^"]+)"', svg)
    out.append(f"  {key}: '" + ''.join(f'<path d="{d}"/>' for d in paths) + "',")

Path('src/components/ui/glyphs.ts').write_text(
    f"""// Icônes Phosphor (https://phosphoricons.com), graisse Bold, licence MIT (THIRD_PARTY_NOTICES.md), @phosphor-icons/core {version}.
// Fichier généré par scripts/phosphor-icons.py : ne pas le modifier à la main.
export const GLYPHS = {{
{chr(10).join(out)}
}} as const;

export type IconName = keyof typeof GLYPHS;
"""
)
duo = []
for key, name in ICONS.items():
    svg = (package / 'assets' / 'duotone' / f'{name}-duotone.svg').read_text()
    paths = re.findall(r'<path d="([^"]+)"( opacity="[^"]+")?', svg)
    duo.append(f"  {key}: '" + ''.join(f'<path d="{d}"{o}/>' for d, o in paths) + "',")

# Fichier a part : lu seulement par le Dock (serveur), il ne grossit pas le paquet client de iconSVG().
Path('src/components/ui/glyphs-duotone.ts').write_text(
    f"""// Icônes Phosphor (https://phosphoricons.com), graisse Duotone, licence MIT (THIRD_PARTY_NOTICES.md), @phosphor-icons/core {version}.
// Fichier généré par scripts/phosphor-icons.py : ne pas le modifier à la main.
import type {{ IconName }} from './glyphs';

export const DUOTONE: Record<IconName, string> = {{
{chr(10).join(duo)}
}};
"""
)
print(f'{len(out)} icones -> src/components/ui/glyphs.ts (@phosphor-icons/core {version})')
