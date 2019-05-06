/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import * as React from 'react';

declare var setTimeout: any
declare var clearTimeout: any

/// [META] START IMPORTS
import { IWidgetCreator, IWidgetFrameData, IWidgetCollection } from '../Shared/Widget Interfaces';
/// [META] END IMPORTS

class WidgetComponent extends React.Component {
    state = { widget_frame_data: undefined, desc_data: undefined, path_value: "" };
    update_grace_timer: any;

    constructor(prop: any) {
        super(prop);
        this.state.widget_frame_data = prop.widget_frame_data;
        this.state.desc_data         = prop.desc_data;
        this.state.path_value        = "";
    }

    componentDidMount() {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;

        WFD.request_updates(this);

        if (WFD.get_desc().Main_Browser_Path === undefined) {
            WFD.get_desc().Main_Browser_Path = WFD.Connexion + ":";
        }

        this.setState({ path_value : WFD.get_desc().Main_Browser_Path });

        this.update_grace_timer = null;
    }

    componentWillUnmount() {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        WFD.remove_updates(this);
    }

    handleBrowserPathChange(e: any) {
        let self = this;

        clearTimeout(this.update_grace_timer);
        this.update_grace_timer = setTimeout(function() { self.update_grace_timer = null }, 500);
        
        let WFD = this.state.widget_frame_data as IWidgetFrameData;

        WFD.get_desc().Main_Browser_Path = e.target.value;
        WFD.notify_update_desc();

        this.setState( { path_value : e.target.value });
    }

    rerender_update(): void {
        let WFD = this.state.widget_frame_data as IWidgetFrameData;
        
        if (this.update_grace_timer != null)
            return;

        this.setState({ path_value : WFD.get_desc().Main_Browser_Path });
    }

    render() {
        return (
            <div>
                <div className="header-element">
                    <input
                        type="text"
                        value={this.state.path_value}
                        onChange={e => this.handleBrowserPathChange(e)}
                    />
                </div>
            </div>
        );
    }
}

let create_implementation = function(console:any): IWidgetCreator {
    console.log("~*~*~ Creating implementation for Browser ~*~*~");

    let _imp:any = {};
    let imp = _imp as IWidgetCreator;

    imp.Name = "Browser";
    imp.React_Module = WidgetComponent;

    return imp;
}