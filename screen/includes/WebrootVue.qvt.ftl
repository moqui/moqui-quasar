<#--
This software is in the public domain under CC0 1.0 Universal plus a
Grant of Patent License.

To the extent possible under law, the author(s) have dedicated all
copyright and related and neighboring rights to this software to the
public domain worldwide. This software is distributed without any
warranty.

You should have received a copy of the CC0 Public Domain Dedication
along with this software (see the LICENSE.md file). If not, see
<http://creativecommons.org/publicdomain/zero/1.0/>.
-->
<div id="apps-root"><#-- NOTE: webrootVue component attaches here, uses this and below for template -->
    <input type="hidden" id="confMoquiSessionToken" value="${ec.web.sessionToken}">
    <input type="hidden" id="confAppHost" value="${ec.web.getHostName(true)}">
    <input type="hidden" id="confAppRootPath" value="${ec.web.servletContext.contextPath}">
    <input type="hidden" id="confBasePath" value="${ec.web.servletContext.contextPath}/apps">
    <input type="hidden" id="confLinkBasePath" value="${ec.web.servletContext.contextPath}/qapps">
    <input type="hidden" id="confUserId" value="${ec.user.userId!''}">
    <input type="hidden" id="confLocale" value="${ec.user.locale.toLanguageTag()}">
    <#assign navbarCompList = sri.getThemeValues("STRT_HEADER_NAVBAR_COMP")>
    <#list navbarCompList! as navbarCompUrl><input type="hidden" class="confNavPluginUrl" value="${navbarCompUrl}"></#list>

    <q-layout view="hHh LpR fFf">

        <q-header reveal bordered class="bg-black text-white"><q-toolbar style="font-size:15px;">
            <q-btn dense flat icon="o_menu" @click="leftOpen = !leftOpen"></q-btn>

            <#assign headerLogoList = sri.getThemeValues("STRT_HEADER_LOGO")>
            <#if headerLogoList?has_content>
                <m-link href="/apps"><div class="q-mx-md q-mt-sm">
                    <img src="${sri.buildUrl(headerLogoList?first).getUrl()}" alt="Home" height="32">
                </div></m-link>
            </#if>
            <#assign headerTitleList = sri.getThemeValues("STRT_HEADER_TITLE")>
            <#if headerTitleList?has_content>
            <q-toolbar-title>${ec.resource.expand(headerTitleList?first, "")}</q-toolbar-title>
            </#if>

            <#-- NOTE: tried using q-breadcrumbs but last item with q-breadcrumbs--last class makes never clickable! -->
            <template v-for="(navMenuItem, menuIndex) in navMenuList"><template v-if="menuIndex < (navMenuList.length - 1)">
                <m-link v-if="navMenuItem.hasTabMenu" :href="getNavHref(menuIndex)">{{navMenuItem.title}}</m-link>
                <div v-else-if="navMenuItem.subscreens && navMenuItem.subscreens.length > 1" class="cursor-pointer">
                    {{navMenuItem.title}}
                    <q-menu anchor="bottom left" self="top left"><q-list dense style="min-width: 200px">
                        <q-item v-for="subscreen in navMenuItem.subscreens" :class="{'bg-primary':subscreen.active, 'text-white':subscreen.active}" clickable v-close-popup>
                            <q-item-section>
                                <m-link :href="subscreen.pathWithParams">
                                    <template v-if="subscreen.image">
                                        <i v-if="subscreen.imageType === 'icon'" :class="subscreen.image" style="padding-right: 4px;"></i>
                                        <img v-else :src="subscreen.image" :alt="subscreen.title" width="18" class="invertible" style="padding-right: 4px;">
                                    </template>
                                    <i v-else class="fa fa-link" style="padding-right: 8px;"></i>
                                    {{subscreen.title}}
                                </m-link></li>
                            </q-item-section>
                        </q-item>
                    </q-list></q-menu>
                </div>
                <m-link v-else :href="getNavHref(menuIndex)">{{navMenuItem.title}}</m-link>

                <q-icon size="1.5em" name="o_chevron_right" color="grey"></q-icon>
            </template></template>
            <m-link v-if="navMenuList.length > 0" :href="getNavHref(navMenuList.length - 1)">{{navMenuList[navMenuList.length - 1].title}}</m-link>

            <q-space></q-space>

            <#-- spinner, usually hidden -->
            <q-circular-progress indeterminate size="20px" color="light-blue" class="q-ma-xs" :class="{ hidden: loading < 1 }"></q-circular-progress>

            <#-- QZ print options placeholder -->
            <component :is="qzVue" ref="qzVue"></component>

            <#-- screen documentation/help -->
            <q-btn dense flat icon="o_help_outline" color="info" :class="{hidden:!documentMenuList.length}">
                <q-tooltip>${ec.l10n.localize("Documentation")}</q-tooltip>
                <q-menu><q-list style="min-width: 300px">
                    <q-item v-for="screenDoc in documentMenuList"><q-item-section>
                        <q-btn flat no-caps :label="screenDoc.title" @click.prevent="showScreenDocDialog(screenDoc.index)"></q-btn>
                    </q-item-section></q-item>
                </q-list></q-menu>
            </q-btn>

            <#-- nav plugins -->
            <template v-for="navPlugin in navPlugins"><component :is="navPlugin"></component></template>

            <#-- notify history -->
            <q-btn dense flat icon="o_notifications">
                <q-tooltip>${ec.l10n.localize("Notify History")}</q-tooltip>
                <q-menu><q-list dense style="min-width: 300px">
                    <q-item v-for="histItem in notifyHistoryList"><q-item-section>
                        <#-- NOTE: don't use v-html for histItem.message, may contain input repeated back so need to encode for security (make sure scripts not run, etc) -->
                        <q-banner dense rounded class="text-white" :class="'bg-' + getQuasarColor(histItem.type)">
                            <strong>{{histItem.time}}</strong> <span>{{histItem.message}}</span>
                        </q-banner>
                    </q-item-section></q-item>
                </q-list></q-menu>
            </q-btn>

            <#-- screen history menu -->
            <#-- get initial history from server? <#assign screenHistoryList = ec.web.getScreenHistory()><#list screenHistoryList as screenHistory><#if (screenHistory_index >= 25)><#break></#if>{url:pathWithParams, name:title}</#list> -->
            <q-btn dense flat icon="o_history">
                <q-tooltip>${ec.l10n.localize("Screen History")}</q-tooltip>
                <q-menu><q-list dense style="min-width: 300px">
                    <q-item v-for="histItem in navHistoryList" clickable v-close-popup><q-item-section>
                        <m-link :href="histItem.pathWithParams">
                            <template v-if="histItem.image">
                                <i v-if="histItem.imageType === 'icon'" :class="histItem.image" style="padding-right: 8px;"></i>
                                <img v-else :src="histItem.image" :alt="histItem.title" width="18" style="padding-right: 4px;">
                            </template>
                            <i v-else class="fa fa-link" style="padding-right: 8px;"></i>
                            {{histItem.title}}
                        </m-link>
                    </q-item-section></q-item>
                </q-list></q-menu>
            </q-btn>

            <#-- screen history previous screen -->
            <#-- disable this for now to save space, not commonly used and limited value vs browser back:
            <a href="#" @click.prevent="goPreviousScreen()" data-toggle="tooltip" data-original-title="${ec.l10n.localize("Previous Screen")}"
               data-placement="bottom" class="btn btn-default btn-sm navbar-btn navbar-right"><i class="glyphicon glyphicon-menu-left"></i></a>
            -->

            <#-- dark/light switch -->
            <q-btn flat dense @click.prevent="switchDarkLight()" icon="o_invert_colors" class="q-mr-xl">
                <q-tooltip>${ec.l10n.localize("Switch Dark/Light")}</q-tooltip></q-btn>
            <#-- logout button -->
            <#-- TODO: figure out why icon is showing to the left of the button -->
            <q-btn flat dense icon="o_settings_power_new" type="a" href="${sri.buildUrl("/Login/logout").url}" onclick="return confirm('${ec.l10n.localize("Logout")} ${(ec.user.userAccount.userFullName)!''}?')">
                <q-tooltip>${ec.l10n.localize("Logout")} ${(ec.user.userAccount.userFullName)!''}</q-tooltip></q-btn>
        </q-toolbar></q-header>

        <q-drawer v-model="leftOpen" side="left" overlay bordered>
            <p>Nothing to see here... yet.</p>
        </q-drawer>

        <q-page-container class="q-ma-sm"><q-page>
            <subscreens-active></subscreens-active>
        </q-page></q-page-container>

        <q-footer reveal bordered class="bg-grey-8 text-white">
            <q-toolbar>
                <#assign footerItemList = sri.getThemeValues("STRT_FOOTER_ITEM")>
                <#list footerItemList! as footerItem>
                    <#assign footerItemTemplate = footerItem?interpret>
                    <@footerItemTemplate/>
                </#list>
            </q-toolbar>
        </q-footer>

    </q-layout>
</div>

<div id="screen-document-dialog" class="modal dynamic-dialog" aria-hidden="true" style="display: none;" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
                <h4 class="modal-title">${ec.l10n.localize("Documentation")}</h4>
            </div>
            <div class="modal-body" id="screen-document-dialog-body">
                <div class="spinner"><div>&nbsp;</div></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-primary" data-dismiss="modal">${ec.l10n.localize("Close")}</button></div>
        </div>
    </div>
</div>

<script>
    window.quasarConfig = {
        brand: { // this will NOT work on IE 11
            // primary: '#e46262',
            // ... or all other brand colors
        },
        // notify: {...}, // default set of options for Notify Quasar plugin
        // loading: {...}, // default set of options for Loading Quasar plugin
        // loadingBar: { ... }, // settings for LoadingBar Quasar plugin
        // ..and many more (check Installation card on each Quasar component/directive/plugin)
    }
</script>
