import Gtk from "gi://Gtk?version=4.0";
import GObject from "gi://GObject";
import GLib from "gi://GLib";

import { Player } from "../../player/index.js";
import { load_thumbnails } from "../webimage.js";
import { PlayerProgressBar } from "./progress.js";
import { QueueTrack } from "libmuse/types/parsers/queue.js";

export interface MiniPlayerViewOptions {
  player: Player;
}

export class MiniPlayerView extends Gtk.Overlay {
  static {
    GObject.registerClass({
      GTypeName: "MiniPlayerView",
      Template: "resource:///com/vixalien/muzika/components/player/mini.ui",
      InternalChildren: [
        "image",
        "title",
        "subtitle",
        "play_button",
        "next_button",
      ],
    }, this);
  }

  private _image!: Gtk.Image;
  private _title!: Gtk.Label;
  private _subtitle!: Gtk.Label;
  private _play_button!: Gtk.Button;
  private _next_button!: Gtk.Button;

  player: Player;

  progress_bar: PlayerProgressBar;

  constructor(options: MiniPlayerViewOptions) {
    super();

    this.player = options.player;

    this.progress_bar = new PlayerProgressBar();
    this.add_overlay(this.progress_bar);

    this.setup_player();
  }

  song_changed() {
    this.progress_bar.reset();
    this.progress_bar.value = 0;

    const song = this.player.queue.current?.item;
    if (song) {
      this.show_song(song!);
    }
  }

  setup_player() {
    this.song_changed();

    // update the player when the current song changes
    this.player.queue.connect(
      "notify::current",
      this.song_changed.bind(this),
    );

    this.player.connect("seeked", (_, position) => {
      this.progress_bar.update_position(position);
    });

    this.player.connect("notify::buffering", () => {
      this.update_play_button();
    });

    this.player.connect("notify::playing", () => {
      this.update_play_button();
    });

    this.player.connect("notify::duration", () => {
      this.progress_bar.set_duration(this.player.duration);
    });
  }

  update_play_button() {
    this.progress_bar.buffering = this.player.buffering && this.player.playing;

    if (this.player.playing && !this.player.buffering) {
      this.progress_bar.play(this.player.get_position() ?? 0);
    } else {
      this.progress_bar.pause();
    }

    if (this.player.playing) {
      this._play_button.icon_name = "media-playback-pause-symbolic";
    } else {
      this._play_button.icon_name = "media-playback-start-symbolic";
    }
  }

  /**
   * loading multiple thumbnails can result in the previous one loading
   * after the current one, so we need to abort the previous one
   */
  abort_thumbnail: AbortController | null = null;

  show_song(track: QueueTrack) {
    if (this.abort_thumbnail != null) {
      this.abort_thumbnail.abort();
      this.abort_thumbnail = null;
    }

    // thumbnail

    this._image.icon_name = "image-missing-symbolic";

    this.abort_thumbnail = new AbortController();

    load_thumbnails(this._image, track.thumbnails, {
      width: 74,
      signal: this.abort_thumbnail.signal,
    });
    // labels

    this._title.label = track.title;
    this._subtitle.label = track.artists[0].name;
  }
}