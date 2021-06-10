# Vanilla JS HTML5 Video Player

Still heavily work in progress :)

![screenshot](https://user-images.githubusercontent.com/2427877/121416664-559c7c80-c969-11eb-95d7-aeed87b1168a.png)

## Functionality

- Playback of all browser supported formats
- Toggleable Subtitles/Captions via VTT
- Basic playback controls
- Basic keyboard shortcuts
- Playback quality controls
- Basic fullscreen capabilities
- Progress and buffering indicator

## Parameters

| Name | Description | Type | Default |
|---|---|---|---|
| selector | A selector query string pointing to the div the player should be rendered in | string | '' |
| poster | The relative or absolute URL pointing to the video preview image | string | '' |
| subtitles | The relative or absolute URL pointing to the video captions VTT file | string | null |
| autoplay | Starts the video playback directly when 'true' is passed | boolean | false |
| rememberVolume | Saves and Restores the volume and mute state via local storage when 'true' is passed | boolean | false |
| startTime | Starts the video playback offset by the given number of seconds | number | 0 |
| deeplink | Shows a deeplink button that copies the url to clipboard on click when filled | string | '' |
| closeCallback | Shows a close button that invokes the provided callback on clicked when filled | function | - |
| translations | Can be provided to overwrite the default english translations. Structure described below | object | - |

## Translations

The player provides english translations as a default. With the `translations` parameter described above these can be overwritten.
The following keys can be provided:

| Name | Description | Default |
|---|---|---|
| pause | Tooltip on the play/pause button when the video is currently playing. | Pause |
| play | Tooltip on the play/pause button when the video is currently paused. | Play |
| restart | Tooltip on the play/pause button when the video reached its end. | Restart |
| mute | Tooltip on the volume button when video is currently not muted. | Mute |
| unmute | Tooltip on the volume button when video is currently muted. | Unmute |
| quality | Tooltip on the quality settings button. | Quality |
| close | Tooltip on the optional close button. | Close |
| deeplink | Tooltip on the optional deeplink copy button. | Copy deeplink to clipboard |
| deeplinkCopied | Popup that is shown when the deeplink button is pressed. | Link was copied |
| fullscreen | Tooltip on the fullscreen button when video is currently not in fullscreen. | Fullscreen |
| exitFullscreen | Tooltip on the fullscreen button when video is currently in fullscreen. | Exit Fullscreen |
| showSubtitles | Tooltip on the subtitles button when video subtitles are currently hidden. | Show Subtitles |
| hideSubtitles | Tooltip on the subtitles button when video subtitles are currently shown. | Hide Subtitles |
