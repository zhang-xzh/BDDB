'use client'

import {Intent, OverlayToaster, type Toaster} from '@blueprintjs/core'

let toasterInstance: Toaster | null = null
let toasterPromise: Promise<Toaster> | null = null

function getToaster(): Promise<Toaster> {
    if (toasterInstance) return Promise.resolve(toasterInstance)
    if (!toasterPromise) {
        toasterPromise = OverlayToaster.createAsync({position: 'top'}).then(t => {
            toasterInstance = t
            return t
        })
    }
    return toasterPromise
}

export async function showToast(message: string, intent: Intent = Intent.NONE) {
    const toaster = await getToaster()
    toaster.show({message, intent, timeout: 3000})
}
