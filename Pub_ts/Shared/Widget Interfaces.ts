/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

export interface IWidgetCreator {
    Name: string;
    React_Module: any;
}

export interface IWidgetCollection {
    get_creator(connexion: string, name: string): IWidgetCreator;
    get_all_loaded(): boolean;
}

export interface IWidgetFrameData {
    Widget_Collection: IWidgetCollection;
    Connexion: string;

    get_desc(): any;
    notify_update_desc(): any;

    request_updates(obj:any): void;
    remove_updates(obj:any): void;

    create_socket_send_with_msg(): ISocketSendInstr;
    send_socket(instr:ISocketSendInstr): void;
}

export interface ISocketSendInstr {
    host_name: string;
    message: any;
    on_success(msg: any): void;
    on_failure(msg: any): void;
}

export interface ISocketResponseHandler {
    on_success(msg: any): void;
    on_failure(msg: any): void;
}