---
layout: home
head:
  - - script
    - {}
    - "(function () { var ls = navigator.languages || [navigator.language || ''], lang = 'en'; for (var i = 0; i < ls.length; i++) { var p = String(ls[i]).toLowerCase().split('-')[0]; if (p === 'fr' || p === 'en') { lang = p; break } } location.replace('/' + lang + '/' + location.search + location.hash) })()"
hero:
  name: REAM
  text: Rust Engine, Agnostic Modules
  image:
    light: /logo-light.svg
    dark: /images/logo-glass.webp
    alt: REAM
  tagline: Documentation — choose your language / choisissez votre langue
  actions:
    - theme: brand
      text: English
      link: /en/
    - theme: alt
      text: Français
      link: /fr/
---
