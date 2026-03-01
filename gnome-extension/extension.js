import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

// hoot writes this file when recording starts, removes it when done
const STATE_FILE = '/tmp/hoot.state';
// hoot-recorder writes RMS amplitude (0.0–1.0) here every 50ms while recording
const LEVEL_FILE = '/tmp/hoot.level';
const HOOT_BIN   = `${GLib.get_home_dir()}/bin/hoot`;

const HootIndicator = GObject.registerClass(
class HootIndicator extends PanelMenu.Button {

    _init() {
        super._init(0.0, 'Hoot');

        this._recording     = false;
        this._currentLevel  = 0;

        this._icon = new St.Icon({
            icon_name:   'audio-input-microphone-muted-symbolic',
            style_class: 'system-status-icon',
        });
        this.add_child(this._icon);

        // Poll state file every 300ms
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._updateState();
            return GLib.SOURCE_CONTINUE;
        });

        // Click → toggle recording
        this.connect('button-press-event', (_actor, event) => {
            if (event.get_button() === Clutter.BUTTON_PRIMARY) {
                try {
                    GLib.spawn_command_line_async(HOOT_BIN);
                } catch (e) {
                    logError(e, 'Hoot: failed to launch');
                }
            }
            return Clutter.EVENT_PROPAGATE;
        });

        this._updateState();
    }

    _updateState() {
        const file    = Gio.File.new_for_path(STATE_FILE);
        const isRec   = file.query_exists(null);

        if (isRec !== this._recording) {
            this._recording = isRec;

            if (isRec) {
                // Recording: show solid mic, start level-driven animation
                this._icon.icon_name = 'audio-input-microphone-symbolic';
                this._startLevel();
            } else {
                // Idle: muted grey mic, stop animation
                this._stopLevel();
                this._icon.icon_name = 'audio-input-microphone-muted-symbolic';
                this._icon.set_opacity(255);
            }
        }
    }

    _startLevel() {
        if (this._levelTimer) return;
        // Poll audio level every 100ms and drive icon brightness accordingly
        this._levelTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!this._recording) return GLib.SOURCE_REMOVE;
            const raw = this._readLevel();
            // Asymmetric smoothing: jump up fast, decay slowly
            if (raw > this._currentLevel)
                this._currentLevel = this._currentLevel * 0.3 + raw * 0.7;
            else
                this._currentLevel = this._currentLevel * 0.75 + raw * 0.25;
            this._applyLevel(this._currentLevel);
            return GLib.SOURCE_CONTINUE;
        });
    }

    _stopLevel() {
        if (this._levelTimer) {
            GLib.source_remove(this._levelTimer);
            this._levelTimer = null;
        }
        this._currentLevel = 0;
        this._icon.style = '';
        this._icon.set_opacity(255);
    }

    _readLevel() {
        try {
            const file = Gio.File.new_for_path(LEVEL_FILE);
            const [ok, contents] = file.load_contents(null);
            if (ok) return Math.min(1.0, parseFloat(new TextDecoder().decode(contents)) || 0);
        } catch (_e) {}
        return 0;
    }

    _applyLevel(level) {
        // Silence (0.0): dark red #882222, opacity 120
        // Loud speech (1.0): bright red-orange #ff6020, opacity 255
        const r = Math.round(136 + level * 119);  // 136 → 255
        const g = Math.round(level * 96);           // 0 → 96
        const opacity = Math.round(120 + level * 135);  // 120 → 255
        this._icon.set_opacity(opacity);
        this._icon.style = `color: rgb(${r}, ${g}, 0);`;
    }

    destroy() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = null;
        }
        this._stopLevel();
        super.destroy();
    }
});

let _indicator = null;

export function enable() {
    _indicator = new HootIndicator();
    // Place it just left of the system indicators (clock area)
    Main.panel.addToStatusArea('hoot', _indicator, 1, 'right');
}

export function disable() {
    _indicator?.destroy();
    _indicator = null;
}
