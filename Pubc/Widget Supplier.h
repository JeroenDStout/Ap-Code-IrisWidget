/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "BlackRoot/Pubc/Files.h"

#include "Conduits/Pubc/Savvy Relay Receiver.h"
#include "Conduits/Pubc/Interface Nexus.h"

namespace IrisWidget {
namespace Backend {

    class WidgetSupplier : public Conduits::SavvyRelayMessageReceiver {
        CON_RMR_DECLARE_CLASS(WidgetSupplier, SavvyRelayMessageReceiver);
        
    public:
        std::shared_ptr<BlackRoot::IO::IFileSource> FileSource;
        Conduits::Raw::INexus                       *Nexus;
        
        CON_RMR_DECLARE_FUNC(open_conduit);
        CON_RMR_DECLARE_FUNC(supply_widgets);
    };

}
}