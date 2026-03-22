<!doctype html>
<html lang="zh-CN">
@php
  $themeConfig = is_array($theme_config ?? null) ? $theme_config : [];
@endphp

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no" />
  <title>{{$title}}</title>
  <link rel="stylesheet" href="/theme/{{$theme}}/assets/main.css?v={{$version}}" />
</head>

<body>
  <script>
    window.routerBase = "/";
    window.settings = {
      title: '{{$title}}',
      assets_path: '/theme/{{$theme}}/assets',
      theme: {
        color: '{{ $themeConfig['theme_color'] ?? "default" }}',
      },
      version: '{{$version}}',
      background_url: '{{ $themeConfig['background_url'] ?? "" }}',
      description: '{{$description}}',
      logo: '{{$logo}}'
    };
  </script>

  <div id="app"></div>
  <script src="/theme/{{$theme}}/assets/main.js?v={{$version}}"></script>
  {!! $themeConfig['custom_html'] ?? '' !!}
</body>

</html>
