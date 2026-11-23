---
layout: home
head:
  - - script
    - {}
    - "(function () { var l = (navigator.languages || [navigator.language || '']).join(',').toLowerCase(); location.replace((/(^|,)fr/.test(l) ? '/fr/' : '/en/') + location.search + location.hash) })()"
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
