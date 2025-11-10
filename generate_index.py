#!/usr/bin/env python3
"""
Generate index.html from template by discovering model folders and injecting links.
"""
import os
import re


def main():
    # Read template
    with open('index.template.html', 'r') as f:
        template = f.read()
    
    # Generate model links
    model_links = []
    for folder in sorted(os.listdir('.')):
        if os.path.isdir(folder) and os.path.isfile(os.path.join(folder, 'index.html')):
            # Convert folder name to display name
            display_name = ' '.join(word.capitalize() for word in re.split(r'[-_]', folder))
            link_html = f'''            <a href="{folder}/" class="model-card">
                <div class="model-name">{display_name} <span class="arrow">→</span></div>
                <div class="model-description">Elevator simulator implementation</div>
            </a>'''
            model_links.append(link_html)
    
    # Replace placeholder
    result = template.replace('{{MODEL_LINKS}}', '\n              \n'.join(model_links))
    
    # Write output
    with open('dist/index.html', 'w') as f:
        f.write(result)
    
    print(f"Generated index.html with {len(model_links)} model links")


if __name__ == '__main__':
    main()
