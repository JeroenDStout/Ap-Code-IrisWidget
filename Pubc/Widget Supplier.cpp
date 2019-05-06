/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#include "BlackRoot/Pubc/Assert.h"

#include "IrisWidget/Pubc/Widget Supplier.h"

using namespace IrisWidget::Backend;

    //  Relay message receiver
    // --------------------

CON_RMR_DEFINE_CLASS(WidgetSupplier);
CON_RMR_REGISTER_FUNC(WidgetSupplier, supply_widgets);

void WidgetSupplier::_supply_widgets(RawRelayMessage * msg) noexcept
{
    this->savvy_try_wrap_read_json(msg, "", [&](JSON json) {
        DbAssertMsgFatal(json.is_object(), "json must be object");
        auto & widget = json["widget"];

        DbAssertMsgFatal(widget.is_string(), "'widget' must be string");
        auto str = widget.get<std::string>();
        str.append(".js");

        if (this->FileSource->FileExists(str)) {
                // Dump stats json in nameless segment
            std::unique_ptr<Conduits::DisposableMessage> reply(new Conduits::DisposableMessage());
            reply->Segment_Map[""] = this->FileSource->ReadFileAsString(str, BlackRoot::IO::IFileSource::OpenInstr{}.DefaultRead());
            reply->sender_prepare_for_send();

            msg->set_response(reply.release());
            msg->set_OK();
            return;
        }

        msg->set_FAILED();
    });
}