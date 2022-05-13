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

## Dependencies

### Modern browsers

None :)

### Internet Explorer 11

Polyfills for Array.prototype.forEach and NodeList.prototype.forEach.

## Parameters

| Name             | Description                                                                                                       | Type     | Default |
|------------------|-------------------------------------------------------------------------------------------------------------------|----------|--|
| selector         | A selector query string pointing to the div the player should be rendered in                                      | string   | '' |
| baseUri          | The absolute URL pointing to the base directory of the library (used for loading icons, ...)                      | string   | '' |
| poster           | The relative or absolute URL pointing to the video preview image                                                  | string   | '' |
| sources          | A list of all video qualities and their sources. Structure described below                                        | array    | - '
| quality          | The name of the quality that should be loaded initially                                                           | string   | - |
| subtitles        | The relative or absolute URL pointing to the video captions VTT file                                              | string   | null |
| autoplay         | Starts the video playback directly when 'true' is passed                                                          | boolean  | false |
| rememberVolume   | Saves and Restores the volume and mute state via local storage when 'true' is passed                              | boolean  | false |
| startTime        | Starts the video playback offset by the given number of seconds                                                   | number   | 0 |
| deeplink         | Shows a deeplink button that copies the url to clipboard on click when filled                                     | string   | '' |
| deeplinkCallback | A function that is called when the deeplink button is clicked - if it returns false, the copy action is supressed | function | - |
| closeCallback    | Shows a close button that invokes the provided callback on clicked when filled                                    | function | - |
| translations     | Can be provided to overwrite the default english translations. Structure described below                          | object   | - |

## Sources

Upon initialization of the player multiple video qualities with multiple source formats can be provided. For this an
array of objects is
passed to the `sources` parameter. The order of the objects also determines their order in the quality setting dropdown.
Each object has the following structure:

| Name | Description |
|---|---|
| quality | Identifier and also name of the quality option shown in the dropdown |
| sources | A list of nested objects describing the different formats. Structure described below |

| Name | Description |
|---|---|
| type | The mime time of the video file format, for example `video/mp4` |
| sources | The actual URI pointing to the video file |

### Sample

```javascript
new Cinematic({
    ...
        sources
:
[
    {
        quality: '1080p',
        sources: [
            {
                type: 'video/webm',
                source: '1080.webm'
            },
            {
                type: 'video/mp4',
                source: '1080.mp4'
            }
        ]
    },
    {
        quality: '720p',
        sources: [
            {
                type: 'video/webm',
                source: '720.webm'
            },
            {
                type: 'video/mp4',
                source: '720.mp4'
            }
        ]
    }
]
})
;
```

## Translations

The player provides english translations as a default. With the `translations` parameter described above these can be
overwritten.
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

## Build / Development

Install typescript:

```
brew install typescript
```

Change .ts file as necessary.

Run TypeScript build in the main project directory:

```
tsc
```
