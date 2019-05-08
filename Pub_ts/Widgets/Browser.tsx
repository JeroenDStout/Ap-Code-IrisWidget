/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as React from 'react';

declare var setTimeout: any
declare var clearTimeout: any
declare var console: any

/// [META] START IMPORTS
import { IWidgetCreator, IWidgetFrameData, IWidgetCollection, ISocketSendInstr } from '../Shared/Widget Interfaces';
import { IMessage } from '../../../Conduits/Pub_ts/Websocket Protocol Interface'
/// [META] END IMPORTS

interface ILocalData {
    Main_Browser_Path: string;
}

class PathingValue {
    msg      = "";
    relays   = new Array<string>();
    commands = new Array<string>();
    widgets  = new Array<string>();
}

class WidgetComponent extends React.Component {
    state = { widget_frame_data: undefined, desc_data: undefined, path_value: "", pathing_value: new PathingValue() };
    update_grace_timer: any;
    asnc_main_browser_path: string;

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

        this.asnc_main_browser_path = local_data.Main_Browser_Path;
        this.setState({ path_value : local_data.Main_Browser_Path });
        this.update_browsing_from_path();

        this.update_grace_timer = null;
    }

    componentWillUnmount() {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        WFD.remove_updates(this);
    }

    prepare_socket_message(path: string): ISocketSendInstr {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        var connexion_split = path.indexOf('/');

        var connexion_name = (connexion_split > 0) ? path.slice(0, connexion_split) : path;
        var message_string = (connexion_split > 0) ? path.slice(connexion_split+1) : "";
        
        let instr = WFD.create_socket_send_with_msg();
        instr.host_name = connexion_name;
        (instr.message as IMessage).set_accepts_response(true);
        (instr.message as IMessage).String = message_string;

        return instr;
    }

    update_browsing_from_path() {
        let self = this;
                
        console.trace("update_browsing_from_path");

        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        if (local_data.Main_Browser_Path === undefined)
            return;

        let instr = this.prepare_socket_message(local_data.Main_Browser_Path + "/dir");
        instr.on_success = function (msg: IMessage) {
            let res = msg.get_segment_as_json("");

            let pathing_value = (msg.String !== undefined) ? msg.String : "";
            let relays:string[];
            let commands:string[];
            let widgets:string[];

            if (res !== undefined) {
                relays = res["relay"] as string[];
                commands = res["dir"] as string[];
            }

            if (relays !== undefined) {
                relays = relays.filter(  e => (e !== 'web' && e !== 'favicon.ico')); 
            }
            else {
                relays = [];
            }
            if (commands !== undefined) {
                widgets  = commands.filter(  e => (e.startsWith('widget_'))); 
                commands = commands.filter(  e => (e !== 'dir' && e !== 'http' && !e.startsWith('widget_') && !e.startsWith('conduit_'))); 
            }
            else {
                commands = [];
                widgets = [];
            }

            self.setState( { pathing_value : { msg : pathing_value, relays : relays, commands : commands, widgets : widgets } });
        }
        instr.on_failure = function (msg: IMessage) {
            self.state.pathing_value.relays = [];
            self.state.pathing_value.commands = [];

            let str:string;

            if (msg !== undefined) {
                str = (msg.String !== undefined) ? msg.String : "";
            }
            else {
                str = "Could not send message";
            }
            
            self.setState( { pathing_value : { msg : str, relays : [], commands : [] } });
        }

        let res = WFD.send_socket(instr);

    }

    handle_browser_path_change(e: any) {
        let self = this;

        clearTimeout(this.update_grace_timer);
        this.update_grace_timer = setTimeout(function() { self.update_grace_timer = null }, 500);
        
        this.handle_override_browser_path(e.target.value);
    }

    handle_override_browser_path(path: string) {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;
        
        let slash_at_end = path.endsWith("/");

        var stack = path.split("/");
        for (var i=0; i< stack.length; i++) {
            if (stack[i].length == 0 || stack[i] == ".") {
                stack.splice(i--, 1);
                continue;
            }
            if (stack[i] == "..") {
                if (i > 0) {
                    stack.splice(i-1, 2);
                    i -= 2;
                }
                else {
                    stack.splice(i, 2);
                    i -= 1;
                }
                continue;
            }
        }
        if (stack.length == 1) {
            path = stack[0]
        }
        else {
            path = stack.join("/");
        }
        if (slash_at_end && path.length > 0) {
            path += "/";
        }

        local_data.Main_Browser_Path = path;
        WFD.notify_update_desc();
        
        this.asnc_main_browser_path = local_data.Main_Browser_Path;
        this.setState( { path_value : path });
        this.update_browsing_from_path();
    }

    handle_action_button_path(path: string) {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;

        let send_time = new Date(Date.now());

        let instr = this.prepare_socket_message(path);
        instr.on_success = instr.on_failure = function (msg: IMessage) {
            let post = WFD.create_post_props();
            post.re_user_action = path;

            if (msg === undefined) {
                post.generic_body = "Could not send message";
                WFD.emit_post(post);
                return;
            }

            post.latency = post.receive_time.getTime() - send_time.getTime();

            post.generic_is_ok = (msg.get_is_OK()) ? 'OK' : 'FAILED';

            let body_string = "";            
            if (msg.String !== undefined) {
                body_string = msg.String;
            }
            
            post.generic_body = body_string.length > 0 ? <span className="generic important">{body_string}</span> : undefined;
            
            let json = msg.get_segment_as_json("");
            if (json !== undefined) {
                post.data_list.push(json);
            }

            WFD.emit_post(post);
        }
        
        WFD.send_socket(instr);
    }

    rerender_update(): void {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;
        
        if (this.update_grace_timer != null)
            return;

        if (this.asnc_main_browser_path !== local_data.Main_Browser_Path) {
            this.asnc_main_browser_path = local_data.Main_Browser_Path;
            this.setState({ path_value : local_data.Main_Browser_Path });
            this.update_browsing_from_path();
        }
    }

    render() {
        let self = this;

        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        let local_data = WFD.get_desc() as ILocalData;

        function handle_relay_button(e:any, item:string) {
            e.preventDefault();
            self.handle_override_browser_path(item);
        }
        function handle_action_button(e:any, item:string) {
            e.preventDefault();
            self.handle_action_button_path(item);
        }
        
        let show_back = false;

        if (local_data.Main_Browser_Path !== undefined) {
            let sp = local_data.Main_Browser_Path.split("/");
            if (sp.length > 1) {
                show_back = true;
            }
        }

        return (
            <div>
                <div className="header-element">
                    <input
                        type="text"
                        className="no-drag"
                        value={this.state.path_value}
                        onChange={e => this.handle_browser_path_change(e)}
                    />
                </div>
                { this.state.pathing_value.msg.length > 0 && (
                    <div className="line-element">{this.state.pathing_value.msg}</div>
                )}
                { (this.state.pathing_value.relays.length > 0 || show_back) && (
                    <div className="list-element"><ul>
                        { show_back && <li><button onClick={(e) => handle_relay_button(e, local_data.Main_Browser_Path + "/../")}>..</button></li> }
                        {this.state.pathing_value.relays.map(item => {
                            return (
                                <li><button className="soft-action no-drag" onClick={(e) => handle_relay_button(e, local_data.Main_Browser_Path + "/" + item)}>{item}</button></li>
                            )}
                        )}
                    </ul></div>
                )}
                { this.state.pathing_value.commands.length > 0 && (
                    <div className="list-element"><ul>
                        {this.state.pathing_value.commands.map(item => {
                            return (
                                <li><button className="hard-action no-drag" onClick={(e) => handle_action_button(e, local_data.Main_Browser_Path + "/" + item)}>{item}</button></li>
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