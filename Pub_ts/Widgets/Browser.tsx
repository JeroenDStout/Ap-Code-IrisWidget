/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as React from 'react';

declare var setTimeout: any
declare var clearTimeout: any
declare var console: any

/// [META] START IMPORTS
import { IWidgetCreator, IWidgetFrameData, IWidgetCollection } from '../Shared/Widget Interfaces';
import { IMessage } from '../../../Conduits/Pub_ts/Websocket Protocol Interface'
/// [META] END IMPORTS

interface ILocalData {
    Main_Browser_Path: string;
}

class PathingValue {
    msg      = "";
    relays   = new Array<string>();
    commands = new Array<string>();
}

class WidgetComponent extends React.Component {
    state = { widget_frame_data: undefined, desc_data: undefined, path_value: "", pathing_value: new PathingValue() };
    update_grace_timer: any;

    constructor(prop: any) {
        super(prop);
        this.state.widget_frame_data = prop.widget_frame_data;
        this.state.desc_data         = prop.desc_data;
        this.state.path_value        = "";
        this.state.pathing_value     = new PathingValue();
    }

    componentDidMount() {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        WFD.request_updates(this);

        if (local_data.Main_Browser_Path === undefined) {
            local_data.Main_Browser_Path = WFD.Connexion + "/";
        }

        this.setState({ path_value : local_data.Main_Browser_Path });
        this.update_browsing_from_path();

        this.update_grace_timer = null;
    }

    componentWillUnmount() {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        WFD.remove_updates(this);
    }

    update_browsing_from_path() {
        let self = this;

        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        if (local_data.Main_Browser_Path === undefined)
            return;

        var connexion_split = local_data.Main_Browser_Path.indexOf('/');

        var connexion_name = (connexion_split > 0) ? local_data.Main_Browser_Path.slice(0, connexion_split) : local_data.Main_Browser_Path;
        var message_string = (connexion_split > 0) ? local_data.Main_Browser_Path.slice(connexion_split+1) : "";
        
        let instr = WFD.create_socket_send_with_msg();
        instr.host_name = connexion_name;
        (instr.message as IMessage).set_accepts_response(true);
        (instr.message as IMessage).String = message_string + "/dir";
        instr.on_success = function (msg: IMessage) {
            let res = msg.get_segment_as_json("");
            console.log("RES", res);

            self.state.pathing_value.msg = (msg.String !== undefined) ? msg.String : "";

            if (res !== undefined) {
                self.state.pathing_value.relays = res["relay"] as string[];
                self.state.pathing_value.commands = res["dir"] as string[];
            }

            if (self.state.pathing_value.relays === undefined)
                self.state.pathing_value.relays = [];
            if (self.state.pathing_value.commands === undefined)
                self.state.pathing_value.commands = [];

            self.forceUpdate();
        }
        instr.on_failure = function (msg: IMessage) {
            self.state.pathing_value.relays = [];
            self.state.pathing_value.commands = [];

            if (msg !== undefined) {
                self.state.pathing_value.msg = (msg.String !== undefined) ? msg.String : "";
            }
            else {
                self.state.pathing_value.msg = "Could not send message";
            }

            self.forceUpdate();
        }

        console.log("SENDING", instr);

        let res = WFD.send_socket(instr);

    }

    handle_browser_path_change(e: any) {
        let self = this;

        clearTimeout(this.update_grace_timer);
        this.update_grace_timer = setTimeout(function() { self.update_grace_timer = null }, 500);
        
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        local_data.Main_Browser_Path = e.target.value;
        WFD.notify_update_desc();

        this.setState( { path_value : e.target.value });
        this.update_browsing_from_path();
    }

    rerender_update(): void {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;
        
        if (this.update_grace_timer != null)
            return;

        if (this.state.path_value !== local_data.Main_Browser_Path) {
            this.setState({ path_value : local_data.Main_Browser_Path });
            this.update_browsing_from_path();
        }
    }

    render() {
        return (
            <div>
                <div className="header-element">
                    <input
                        type="text"
                        value={this.state.path_value}
                        onChange={e => this.handle_browser_path_change(e)}
                    />
                </div>
                { this.state.pathing_value.msg.length > 0 && (
                    <div className="line-value">{this.state.pathing_value.msg}</div>
                )}
                { this.state.pathing_value.relays.length > 0 && (
                    <div className="list-element"><ul>
                        {this.state.pathing_value.relays.map(item => {
                            return (
                                <li key={item}>{item}</li>
                            )}
                        )}
                    </ul></div>
                )}
                { this.state.pathing_value.commands.length > 0 && (
                    <div className="list-element"><ul>
                        {this.state.pathing_value.commands.map(item => {
                            return (
                                <li key={item}>{item}</li>
                            )}
                        )}
                    </ul></div>
                )}
            </div>
        );
    }
}

let create_implementation = function(): IWidgetCreator {
    console.log("~*~*~ Creating implementation for Browser ~*~*~");

    let _imp:any = {};
    let imp = _imp as IWidgetCreator;

    imp.Name = "Browser";
    imp.React_Module = WidgetComponent;

    return imp;
}