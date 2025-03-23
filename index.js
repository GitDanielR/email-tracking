const getRandomFutureDate = function () {
    const today = new Date();
    const randomDays = Math.floor(Math.random() * 365) + 1;

    const futureDate = new Date();
    futureDate.setDate(today.getDate() + randomDays);
    return futureDate;
};

HTMLElement.prototype.multiSelect = function(options) {
    const self = this;
    const getAll = function () {
        return Array.from(self.querySelectorAll("[data-multi-selected='true']")).map($row => {
            return $row.dataset.id;
        });
    };
    const clearAll = function () {
        self.querySelectorAll("[data-multi-selected='true']").forEach($row => {
            $row.removeAttribute("data-multi-selected");
            $row.removeAttribute("data-multi-last");
        });
    };
    const checkClear = function (e) {
        if (e.target.closest(".multiselect-ignore") === null && e.target.closest(options.selector + "[data-multi-selectable='true']") === null) {
            clearAll();
        }
    };
    if (options === "get") {
        return getAll();
    }
    if (options === "clear") {
        clearAll();
        return;
    }
    if (options === "delete") {
        clearAll();
        self.querySelectorAll(options.selector + "[data-multi-selectable='true']").forEach($row => {
            $row.removeEventListener("click", handleClick);
        });
        document.removeEventListener("click", checkClear);
        return;
    }
    
    let currOptions = Object.assign({}, options);
    currOptions.$container.classList.add("multi-container");

    const markSelected = function ($targetRow, $lastSelected) {
        $targetRow.setAttribute("data-multi-selected", true);
        $targetRow.setAttribute("data-multi-last", true);
        if ($lastSelected !== null) {
            $lastSelected.removeAttribute("data-multi-last");        
        }
    };

    const handleClick = function (e) {
        const $lastSelected = self.querySelector(options.selector + "[data-multi-last='true']");
        const $targetRow = e.target.closest(options.selector);
        if ($lastSelected === null) {
            markSelected($targetRow, null);
            return;
        }
        if (e.shiftKey) {
            let numPasses = 0;
            let $rows = self.querySelectorAll(options.selector + "[data-multi-selectable='true']");
            for (const $row of $rows) {
                if (numPasses === 1) {
                    $row.setAttribute("data-multi-selected", true);
                }
                if ($row.dataset.id === $lastSelected.dataset.id || $row.dataset.id === $targetRow.dataset.id) {
                    numPasses++;
                }
                if (numPasses === 2) {
                    break;
                }
            }
        } else if (!e.ctrlKey) {
            clearAll();
        }
        markSelected($targetRow, $lastSelected);
    };

    self.querySelectorAll(options.selector + "[data-multi-selectable='true']").forEach($row => {
        $row.addEventListener("mousedown", handleClick);
    });
    document.addEventListener("mousedown", checkClear);
};

HTMLElement.prototype.materialChip = function (options) {
    const self = this;
    if (options === "get") {
        return Array.from(self.querySelector(".chips-container").children).map($chip => parseInt($chip.dataset.id));
    }
    
    let currOptions = Object.assign({}, options);
    currOptions.selected = new Set(options.preselect);
    
    self.innerHTML = document.getElementById("material_chip").innerHTML;
    const $chipContainer = self.querySelector(".chips-container");
    const $input = self.querySelector("input");
    const $dropdown = self.querySelector(".chips-dropdown");

    const deleteSelectedChip = function (e) {
        currOptions.selected.delete(parseInt(e.target.dataset.id));
        e.target.remove();
        buildDropdown();
    };
    const selectChip = function (e) {
        $input.value = "";
        const item = currOptions.data.find(item => item.id == e.target.dataset.id);
        
        const chipHtml = `<div class="chip" data-id=${item.id}>${item.label}</div>`;
        if (currOptions.single) {
            $chipContainer.innerHTML = chipHtml;
            currOptions.selected.clear();
        } else {
            $chipContainer.innerHTML += chipHtml;
        }
        currOptions.selected.add(item.id);
        e.target.remove();
    };
    const buildDropdown = function (e) {
        const search = $input.value;
        const dropdownOptions = currOptions.data.filter(item => !currOptions.selected.has(item.id) && item.label.toLowerCase().includes(search));
        $dropdown.innerHTML = dropdownOptions.reduce((aggregate, item) => {
            return aggregate + `<div class="chips-dropdown-option" data-id=${item.id}>${item.label}</div>`;
        }, "");
        $dropdown.querySelectorAll(".chips-dropdown-option").forEach($dropdownOption => {
            $dropdownOption.addEventListener("click", selectChip);
        });
    };
    const checkHideDropdown = function (e) {
        if (e.target.closest("input") === null && e.target.closest(".chips-dropdown") === null) {
            $dropdown.classList.add("hidden");
        }
    };

    $input.addEventListener("input", buildDropdown);
    $input.addEventListener("focusin", e => $dropdown.classList.remove("hidden"));
    $chipContainer.addEventListener("click", e => { 
        if (e.target.classList.contains("chip")) {
            deleteSelectedChip(e);
        } else {
            $input.focus(); 
        }
    });
    document.addEventListener("mousedown", checkHideDropdown);
    buildDropdown();

    if (currOptions.preselect !== undefined) {
        $chipContainer.innerHTML = currOptions.preselect.reduce((aggregate, itemId) => {
            return aggregate + `<div class="chip" data-id=${itemId}>${currOptions.data.find(i => i.id === itemId).label}</div>`;
        }, "");
    }
    $dropdown.classList.add("hidden");
};

class idHandler {
    static setupIds () {
        this.ids = new Array(10).fill(undefined);
    }

    static getNextId () {
        let index = 0;
        while (index < this.ids.length) {
            if (this.ids[index] === undefined) {
                return index;
            }
            index++;
        }
        this.ids.length *= 2;
        this.ids.fill(undefined, index, this.ids.length);
        return index;
    }

    static delete(id) {
        this.ids[id] = undefined;
    }
}

let Class = {};
Class.Contact = class extends idHandler {
    constructor (first_name, last_name) {
        super();
        this.id = this.constructor.getNextId();
        this.constructor.ids[this.id] = true;
        this.first_name = first_name;
        this.last_name = last_name;
    }

    get displayName() {
        return this.first_name + " " + this.last_name;
    }
}
Class.Contact.setupIds();

Class.Email = class extends idHandler {
    static thread_ids = new Array(10).fill(undefined);

    constructor (is_read, subject, message, recipients, parent, sender, thread_id) {
        super();
        this.id = this.constructor.getNextId();
        this.constructor.ids[this.id] = true;
        this.is_read = is_read;
        this.subject = subject;
        this.message = message;
        this.sender = sender;
        this.parent = parent ?? -1;
        this.date_created = thread_id ? getRandomFutureDate() : new Date(),
        this.thread_id = thread_id ?? Class.Email.getNextThreadId();
        if (thread_id === undefined) {
            Class.Email.thread_ids[this.thread_id] = this.id;
        }
        this.updateRecipients(recipients);
        this.updateSender(sender);
    }

    static getNextThreadId () {
        let index = 0;
        while (index < Class.Email.thread_ids.length) {
            if (Class.Email.thread_ids[index] === undefined) {
                return index;
            }
            index++;
        }
        Class.Email.thread_ids.length *= 2;
        Class.Email.thread_ids.fill(undefined, index, Class.Email.thread_ids.length);
        return index;
    }

    updateSender (sender) {
        this.sender = sender;
        this.sender_string = Util.getContactString([sender]);
    }

    updateRecipients (recipients) {
        this.recipients = Util.getUnique(recipients);
        this.recipients_string = Util.getContactString(this.recipients);
    }

    [Symbol.iterator] () {
        let index = 0;
        const entries = Object.entries(this).filter(([key, value]) => typeof value === "string");

        return {
            next: () => {
                if (index < entries.length) {
                    return { value: entries[index++], done: false };
                } else {
                    return { done: true };
                }
            },
        };
    }
}
Class.Email.setupIds();

Class.Folder = class extends idHandler {
    constructor (name, parent) {
        super();
        this.id = this.constructor.getNextId();
        this.constructor.ids[this.id] = true;
        this.name = name;
        this.parent = parent ?? -1;
    }

    [Symbol.iterator] () {
        let index = 0;
        const entries = Object.entries(this).filter(([key, value]) => typeof value === "string");

        return {
            next: () => {
                if (index < entries.length) {
                    return { value: entries[index++], done: false };
                } else {
                    return { done: true };
                }
            },
        };
    }
}
Class.Folder.setupIds();

Class.Resource = class extends EventTarget {
    constructor(initializeCallback) {
        super();
        this.currentItems = [];
        this.currentParents = [];
        this._searchText = "";
        this.sortDir = "";
        this.itemSortType = "";
        this.parentSortType = "";
        this.parent = -1;
        this.filteredItems = [];
        this.filteredParents = [];
        this._tab = "";
        this.tabUpdatePending = false;
        this.filterLength = 0;
        this._page = 1;
        this.numPages = 1;
        this.paginationSize = 15;
        this.isPaginating = false;
        
        if (initializeCallback !== undefined) {
            initializeCallback(this);
        }
    }

    get tab () {
        return this._tab;
    }

    set tab (value) {
        this._tab = value;
        this.tabUpdatePending = true;
    }

    get page () {
        return this._page;
    }

    set page (value) {
        let success = false;
        if (!(isNaN(value) || value < 1 || value > Math.ceil(this.filterLength / this.paginationSize)) && this._page !== value) {
            success = true;
            this._page = value;
        }
        const pageChangeEvent = new CustomEvent("pageupdate", {
            detail: {
                page: this._page,
                success: success
            }
        });
        this.dispatchEvent(pageChangeEvent);
    }

    checkAndEmitPageUpdate () {
        const newNumberPages = Math.floor((this.filterLength - 1) / this.paginationSize) + 1;
        if (this.tabUpdatePending || newNumberPages !== this.numPages) {
            this.tabUpdatePending = false;
            this.numPages = newNumberPages;
            const pageUpdateEvent = new CustomEvent("numberpageschanged", {
                detail: {
                    numberPages: newNumberPages
                }
            });
            this.dispatchEvent(pageUpdateEvent);
        }
    }

    getSingle (id, isParent) {
        if (isParent) {
            return this.currentParents.find(p => p.id == id);
        }
        return this.currentItems.find(p => p.id == id);
    }

    getAll (callback, filter = false, filterByParent = false, filterByTab = false, filterBySearch = false, itemSearchColumn = "", parentSearchColumn = "", sort = false, onlyPaginate = false, onlySearch = false) {
        if ((filter && !onlyPaginate) || onlySearch) {
            this.filter(filterByParent, filterByTab, filterBySearch, itemSearchColumn, parentSearchColumn, onlySearch);
        }
        if (sort && !onlyPaginate && !onlySearch) {
            this.sort(filter);
        }

        let returnData = filter ? {
            items: this.filteredItems,
            parents: this.filteredParents
        } : {
            items: this.currentItems,
            parents: this.currentParents
        };
        this.filterLength = returnData.items.length;
        if (this.isPaginating) {
            this.checkAndEmitPageUpdate();
            callback(this.paginate(returnData));
        } else {
            callback(returnData);
        }
    }

    paginate ({ items, parents}) {
        const start = (this._page -  1) * this.paginationSize;
        const end = Math.min(items.length, this._page * this.paginationSize);
        return {
            items: items.slice(start, end),
            parents: parents
        };
    }

    filter (filterByParent = true, filterByTab = true, filterBySearch = true, itemSearchColumn = "all", parentSearchColumn = "all", onlySearch = false) {
        const self = this;
        const matchesParent = function (item) {
            if (!filterByParent || onlySearch) {
                return true;
            }
            return item.parent == self.parent;
        };
        const matchesTab = function (item) {
            if (!filterByTab || onlySearch) {
                return true;
            }
            return self.tabFilter(item);
        };
        const matchesSearch = function (item, isParent) {
            if (!filterBySearch || self.searchText === "") {
                return true;
            }
            if (!isParent) {
                if (itemSearchColumn !== "all") {
                    return item[itemSearchColumn] && item[itemSearchColumn].toLowerCase().includes(self.searchText);
                } else {
                    for (const [key, value] of item) {
                        if (value.toString().toLowerCase().includes(self.searchText)) {
                            return true;
                        }
                    }
                }
            } else {
                if (parentSearchColumn !== "all") {
                    return item[parentSearchColumn] && item[parentSearchColumn].toLowerCase().includes(self.searchText);
                } else {
                    for (const [key, value] of item) {
                        if (value.toString().toLowerCase().includes(self.searchText)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };
        this.filteredItems = this.currentItems.filter(item => {
            return matchesParent(item) && matchesTab(item) && matchesSearch(item, false);
        });
        this.filteredParents = this.currentParents.filter(item => {
            return matchesParent(item) && matchesTab(item) && matchesSearch(item, true);
        });
    }

    sort (sortFiltered) {
        const self = this;
        const getSortFunction = function (itemComparingType, isParent) {
            let itemComparingFunction = undefined;
            if (itemComparingType === "string") {
                itemComparingFunction = function (itemA, itemB) {
                    return itemA[isParent ? self.parentSortType : self.itemSortType].localeCompare(itemB[isParent ? self.parentSortType : self.itemSortType]);
                };
            } else if (itemComparingType === "number") {
                itemComparingFunction = function (itemA, itemB) {
                    return itemA[isParent ? self.parentSortType : self.itemSortType] - itemB[isParent ? self.parentSortType : self.itemSortType];
                };
            } else if (itemComparingType === "boolean") {
                itemComparingFunction = function (itemA, itemB) {
                    const valueA = itemA[isParent ? self.parentSortType : self.itemSortType];
                    const valueB = itemB[isParent ? self.parentSortType : self.itemSortType];
                    return valueA === valueB ? 0 : valueA ? 1 : -1;
                };
            }
            return itemComparingFunction;
        };
        const sortItems = function (isParent) {
            let items = isParent ? (sortFiltered ? self.filteredParents : self.currentParents) : (sortFiltered ? self.filteredItems : self.currentItems);
            let sortType = isParent ? self.parentSortType : self.itemSortType;
            if (items.length > 0) {
                let itemComparingFunction = getSortFunction(typeof items[0][sortType], isParent);
                if (itemComparingFunction !== undefined) {
                    items.sort(itemComparingFunction);
                    if (self.sortDir === "desc") {
                        items.reverse();
                    }
                }
            }
        };
        sortItems(false); // sort items
        sortItems(true);  // sort parents
    }

    get searchText () {
        return this._searchText;
    }

    set searchText (value) {
        const newValue = value.toLowerCase().trim();
        
        if (newValue !== this._searchText) {
            this._searchText = newValue;
            const searchTextUpdateEvent = new CustomEvent("searchupdate", {
                detail: {
                    searching: this.isSearching()
                }
            });
            this.dispatchEvent(searchTextUpdateEvent);
        }
    }

    isSearching () {
        return this._searchText !== "";
    }
}

let Master = {};
Master.Storage = {
    contacts: [
        new Class.Contact("Me", "Me")
    ]
};

let Email = {};
Email.load = function  () {
    Util.generateContacts(10);
    Util.generateEmails(1);
    Util.generateFolders(3);
    Email.UI.init();
};

Email.UI = {
    Elements: {
        email_body: undefined,
        email_table: undefined,
        email_preview: undefined,
        pagination: undefined
    },
    Resource: new Class.Resource(self => {
        self.isPaginating = true;
        self.sortDir = "asc";
        self.itemSortType = "is_read";
        self.parentSortType = "name";
        self.tab = "inbox";
        self.tabFilter = function (item) {
            if (item instanceof Class.Folder) {
                return self.tab === "inbox";
            }
            return self.tab === "inbox" ? item.recipients.includes(0) && Class.Email.thread_ids[item.thread_id] === item.id : item.sender === 0; 
        };
    }),
    templates: {
        breadcrumbs: document.getElementById("breadcrumb_template").innerHTML,
        emailPreviewTemplate: document.getElementById("email_preview_template").innerHTML,
        emailReplyTemplate: document.getElementById("email_reply_preview_template").innerHTML,
        rowTemplate: document.getElementById("row_template").innerHTML
    },
    init: function () {
        this.getContainers();

        // artificial delay
        Email.UI.Elements.email_body.innerHTML = document.getElementById("loading_spinner").innerHTML;
        setTimeout(() => {
            this.bindSingleEvents();
            this.buildTable();
        }, 1000);
    },
    getContainers: function() {
        Email.UI.Elements.email_body = document.getElementById("email_body");
        Email.UI.Elements.email_table = document.getElementById("email_table");
        Email.UI.Elements.email_preview = document.getElementById("email_preview");
        Email.UI.Elements.pagination = document.getElementById("pagination_container");
    },
    buildTable: function (isPageChange = false, isSearch = false) {
        Email.UI.Resource.getAll(data => {
            let html = "";
            html += data.parents.reduce((aggregate, folder) => {
                return  aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                    id: folder.id,
                    activates: "folder_row_dropdown",
                    is_folder: 1,
                    is_read: "&#128193;",
                    subject: "",
                    sender: "",
                    message: folder.name,
                    recipients: "",
                    multi_selectable: "false"
                });
            }, "");

            if (data.items.length === 0) {
                Email.UI.Elements.pagination.classList.add("hidden");
                Email.UI.buildEmpty(html);
            } else {
                html += data.items.reduce((aggregate, email) => {
                    return aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                        id: email.id,
                        activates: "email_row_dropdown",
                        is_folder: 0,
                        is_read: email.is_read ? "" : "&#x2022;",
                        subject: email.subject,
                        message: email.message,
                        sender: Util.getContactString([email.sender]),
                        recipients: email.recipients_string,
                        multi_selectable: "true"
                    });
                }, "");

                Email.UI.Elements.pagination.classList.remove("hidden");
                Email.UI.Elements.email_table.querySelector("#email_header").classList.remove("hidden");
                Email.UI.Elements.email_body.innerHTML = html;
                Email.UI.bindEvents();
            }
        }, true, true, true, true, "all", "name", true, isPageChange, isSearch);
    },
    buildEmpty: function (html) {
        let message = Email.UI.Resource.isSearching() ? `No emails ${html.trim() === "" ? " or folders " : ""} match search '${Email.UI.Resource.searchText}'.` : Email.UI.Resource.parent !== -1 ? `No emails ${html.trim() === "" ? " or folders " : ""} in folder ${Util.getFolder(Email.UI.Resource.parent).name}.` : "You have no emails or folders.";
        EmptyView.create({
            $container: Email.UI.Elements.email_body,
            prependedHtml: html,
            names: {
                title: "Nothing to see here",
                message: message,
                create_new_description: "Send Email"
            },
            create: function () {
                Dropdowns.email_row_dropdown.new_email();
            }
        });
        if (html === undefined || html === "") {
            Email.UI.Elements.email_table.querySelector("#email_header").classList.add("hidden");
        } else {
            Email.UI.Elements.email_table.querySelector("#email_header").classList.remove("hidden");
            Email.UI.bindEvents();
        }
    },
    buildBreadcrumbs: function () {
        let folderPath = [];
        let currentFolder = Util.getFolder(Email.UI.Resource.parent);
        while (currentFolder !== undefined) {
            folderPath.push(currentFolder);
            currentFolder = Util.getFolder(currentFolder?.parent);
        }
        folderPath.push(undefined);
        folderPath.reverse();

        let folderHtmls = folderPath.map(folder => {
            return Util.templateHelper(Email.UI.templates.breadcrumbs, {
                id: folder ? folder.id : -1,
                name: folder ? folder.name : "Home"
            });
        });
        document.getElementById("breadcrumbs").innerHTML = folderHtmls.join("<div> <b>></b></div>");
        document.querySelectorAll(".breadcrumbs").forEach($breadcrumb => {
            $breadcrumb.addEventListener("click", Events.switchFolder);
        });
    },
    bindEvents: function () {
        Email.UI.Elements.email_body.multiSelect({
            selector: ".table-row",
            $container: Email.UI.Elements.email_body
        });
        Email.UI.Elements.email_body.querySelectorAll(".table-row").forEach($tableRow => {
            $tableRow.removeEventListener("contextmenu", Events.showDropdownOptions);
            $tableRow.addEventListener("contextmenu", Events.showDropdownOptions);
            $tableRow.addEventListener("dragover", Events.handleDragOver);
            if ($tableRow.dataset.isFolder === "1") {
                $tableRow.addEventListener("dragleave", Events.handleDragLeave);
                $tableRow.addEventListener("drop", Events.handleDrop);
            } else {
                $tableRow.removeEventListener("click", Events.showEmailPreview);
                $tableRow.addEventListener("click", Events.showEmailPreview);

                $tableRow.addEventListener("dragstart", Events.handleDragStart);
                $tableRow.addEventListener("dragend", Events.handleDragEnd);
            }
        });
    },
    bindSingleEvents: function () {
        Email.UI.Elements.email_table.querySelector("#email_header").querySelectorAll(".column").forEach($emailColumn => {
            $emailColumn.addEventListener("click", Events.applySort);
        });
        document.querySelector("#search_bar input").addEventListener("input", e => {
            Email.UI.Resource.searchText = e.target.value;
        });
        document.getElementById("clear_search_bar").addEventListener("click", e => {
            const searchBar = document.querySelector("#search_bar input"); 
            searchBar.value = "";

            const inputEvent = new Event("input", {
                bubbles: true,
                cancelable: true
            });
            searchBar.dispatchEvent(inputEvent);
        });
        document.getElementById("tabs").childNodes.forEach($tab => {
            $tab.addEventListener("click", Events.switchTab);
        });
        Email.UI.Elements.pagination.querySelector("#pagination_turn_left").addEventListener("click", e => {
            Email.UI.Resource.page--;
        });
        Email.UI.Elements.pagination.querySelector("#pagination_page input").addEventListener("input", e => {
            if (e.data === null && e.target.value === "") {
                return;
            }
            Email.UI.Resource.page = parseInt(e.target.value);
        });
        Email.UI.Elements.pagination.querySelector("#pagination_turn_right").addEventListener("click", e => {
            Email.UI.Resource.page++;
        });
        Email.UI.Resource.addEventListener("pageupdate", e => {
            Email.UI.Elements.pagination.querySelector("#pagination_page input").value = e.detail.page;
            if (e.detail.success) {
                Email.UI.buildTable(true, false);
            }
        });
        Email.UI.Resource.addEventListener("searchupdate", e => {
            if (e.detail.searching) {
                document.getElementById("clear_search_bar").classList.remove("hidden");
            } else {
                document.getElementById("clear_search_bar").classList.add("hidden");
            }
            Email.UI.buildTable(false, true);
        });
        Email.UI.Resource.addEventListener("numberpageschanged", e => {
            Email.UI.Elements.pagination.querySelector("#pagination_number_pages").innerHTML = e.detail.numberPages;
            Email.UI.Elements.pagination.querySelector("#pagination_plural").innerHTML = e.detail.numberPages > 1 ? "s" : "";
        });
    },
    showEmailPreview: function (emailId) {
        let email = Util.getEmail(emailId);

        const emailsInThread = Util.getEmailThread(email.thread_id);
        const emailsInThreadHtml = emailsInThread.reduce((memo, currentEmail) => {
            return memo + Util.templateHelper(Email.UI.templates.emailReplyTemplate, {
                sender: currentEmail.sender_string,
                recipients: currentEmail.recipients_string,
                subject: currentEmail.subject,
                message: currentEmail.message,
                time_created: Util.formatDate(currentEmail.date_created)
            });
        }, "");
        const emailHtml = Util.templateHelper(Email.UI.templates.emailPreviewTemplate, {
            id: emailId,
            email_reply_chain: emailsInThreadHtml
        });
        
        Email.UI.Elements.email_preview.innerHTML = emailHtml;
        Email.UI.Elements.email_preview.classList.remove("hidden");
        Email.UI.Elements.email_preview.querySelector("#reply_to_email").addEventListener("click", Events.replyToEmail);
        Email.UI.Elements.email_preview.querySelector("#close_preview_button").addEventListener("click", Events.closeEmailPreview);

        Email.UI.Elements.email_body.querySelector(".table-row.previewing")?.classList.remove("previewing");
        Email.UI.Elements.email_body.querySelector(Util.getIdSelector(email.id)).classList.add("previewing");
    },
    updateEmailRowValues: function (email) {
        let $row = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(email.id));
        $row.querySelector(".column.read").innerHTML = email.is_read ? "" : "&#x2022;";
        $row.querySelector(".column.recipients").innerHTML = email.recipients_string;
        $row.querySelector(".column.subject").innerHTML = email.subject;
        $row.querySelector(".column.message").innerHTML = email.message;
    },
    markHtmlRead: function (email) {
        let $row = Email.UI.Elements.email_table.querySelector(Util.getIdSelector(email.id) + ":not([data-is-folder='1'])");
        $row.querySelector(".read").innerHTML = "";
    },
    deleteRow: function (id, isEmail = true) {
        let $row = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(id, isEmail));
        $row.remove();

        if (Email.UI.Elements.email_body.children.length === 0) {
            Email.UI.buildEmpty("");
        }
    }
};

let Events = {
    showDropdownOptions: function (e) {
        e.preventDefault();

        let $rowWithDropdown = e.target.closest(".dropdown-row"); 
        let dropdownId = $rowWithDropdown.dataset.activates;
        let $dropdown = document.getElementById(dropdownId);
        $dropdown.style.display = "block";
        $dropdown.style.top = e.clientY + "px";
        $dropdown.style.left = (e.clientX + 10) + "px";
        document.querySelectorAll(`ul:not(#${dropdownId})`).forEach($otherDropdown => {
            $otherDropdown.style.display = "none";
        });
        
        let dropdownItems = $rowWithDropdown.dataset.multiSelectable === "true" ? $rowWithDropdown.closest(".multi-container").multiSelect("get") : $rowWithDropdown.dataset.id;
        let item = dropdownId === "email_row_dropdown" ? Util.getEmail($rowWithDropdown.dataset.id) : Util.getFolder($rowWithDropdown.dataset.id);
        for (const [key, value] of Object.entries(item)) {
            if (typeof value !== "string" && typeof value !== "object") {
                $dropdown.dataset[key] = value;
            }
        }
        $dropdown.dataset.multiSelected = dropdownItems.length;

        const closeDropdown = function (event) {
            $dropdown.style.display = "none";
            document.removeEventListener("click", closeDropdown)
        };
        document.addEventListener("click", closeDropdown);

        const handleDropdownClick = function (event) {
            Events.closeEmailPreview();
            Dropdowns[$dropdown.id][event.target.dataset.action](dropdownItems);
            Array.from($dropdown.children).forEach(dropdownOption => {
                dropdownOption.removeEventListener("click", handleDropdownClick);
            });
        };
        Array.from($dropdown.children).forEach(dropdownOption => {
            dropdownOption.addEventListener("click", handleDropdownClick);
        });
    },
    clearSearch: function (e) {
        Email.UI.Resource.clearSearch();
    },
    showEmailPreview: function (e) {
        const emailId = e.target.closest(".table-row").dataset.id;
        Email.UI.markHtmlRead(Util.getEmail(emailId));
        Email.UI.showEmailPreview(emailId);
    },
    replyToEmail: function (e) {
        const emailId = e.target.closest("div[data-id]").dataset.id;
        Dropdowns.email_row_dropdown.reply(emailId);
    },
    closeEmailPreview: function (e) {
        if (Email.UI.Elements.email_preview.children.length > 0) {
            const previewedEmailId = Email.UI.Elements.email_preview.children[0].dataset.id;
            Email.UI.Elements.email_body.querySelector(Util.getIdSelector(previewedEmailId)).classList.remove("previewing");
            Email.UI.Elements.email_preview.classList.add("hidden");
        }
    },
    applySort: function (e) {
        const $header = e.target.closest(".header");
        $header.querySelectorAll(".column span").forEach($arrow => {
            $arrow.classList.add("hidden");
            $arrow.style.transform = "";
        });
        const sortType = e.target.dataset.sort;
        if (sortType === Email.UI.Resource.itemSortType) {
            if (Email.UI.Resource.sortDir === "desc") {
                Email.UI.Resource.itemSortType = "is_read";
                Email.UI.Resource.sortDir = "asc";
            } else {
                Email.UI.Resource.sortDir = Email.UI.Resource.sortDir === "" ? "asc" : "desc";
            }
        } else {
            Email.UI.Resource.itemSortType = sortType;
            Email.UI.Resource.sortDir = "asc";
        }
        let $arrow = $header.querySelector(`.column[data-sort="${Email.UI.Resource.itemSortType}"] span`);
        $arrow.classList.remove("hidden");
        if (Email.UI.Resource.sortDir === "desc") {
            $arrow.style.transform = "rotate(180deg)";
        }
        Email.UI.buildTable();
    },
    switchFolder: function (e) {
        let folderId = e.target.parentElement.dataset.id;
        Util.setFolder(folderId);
    },
    switchTab: function (e) {
        const $target = e.target;
        const tab = $target.id.split("_")[0];
        if (tab !== Email.UI.Resource.tab) {
            Array.from(e.target.parentElement.children).forEach($tab => {
                $tab.classList.remove("active");
            });
            $target.classList.add("active");
            $target.closest(".widget").setAttribute("current-tab", tab);

            Email.UI.Resource.page = 1;
            Email.UI.Resource.tab = tab;
            Email.UI.buildTable();
        }
    },
    handleDragStart: function (e) {
        e.dataTransfer.setData("text/plain", e.target.dataset.id);
        e.target.classList.add("dragging");
    },
    handleDragOver: function (e) {
        e.preventDefault();
        const $targetRow = e.target.closest(".table-row");

        if ($targetRow && $targetRow.dataset.isFolder === "1") {
            e.dataTransfer.dropEffect = "move"; 
            $targetRow.classList.add("over");
        } else {
            e.dataTransfer.dropEffect = "none";
        }
    },
    handleDragLeave: function (e) {
        e.preventDefault();
        const $targetRow = e.target.closest(".table-row");
        if ($targetRow) {
            $targetRow.classList.remove("over");
        }
    },
    handleDrop: function (e) {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        const $draggedRow = document.getElementById(draggedId);
        const $targetRow = e.target.closest(".table-row");

        $draggedRow.classList.remove("dragging");
        $targetRow.classList.remove("over");
        if ($targetRow && $targetRow.dataset.isFolder === "1") {
            let email = Util.getEmail($draggedRow.id);
            email.parent = parseInt($targetRow.id);
            Email.UI.deleteRow(email.id);
        }
    },
    handleDragEnd: function (e) {
        e.target.classList.remove("dragging");
    }
};

let Util = {
    getEmail: function (id) {
        return Email.UI.Resource.getSingle(id, false);
    },
    getFolder: function (id) {
        return Email.UI.Resource.getSingle(id, true);
    },
    getEmailThread: function (thread_id) {
        let emailArray = Email.UI.Resource.currentItems.filter(e => e.thread_id == thread_id);
        emailArray.sort((a,b) => a.date_created - b.date_created);
        return emailArray;
    },
    getIdSelector: function (id, isEmail = true) {
        return ".table-row[data-is-folder='"+ (+!isEmail) + "'][data-id='" + id + "']";
    },
    formatDate: function (dateObj) {
        const isDate = function (comparingDate) {
            return dateObj.getFullYear() === comparingDate.getFullYear() && dateObj.getMonth() === comparingDate.getMonth() && dateObj.getDate() === comparingDate.getDate();
        }

        if (isDate(new Date())) {
            return "Today";
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate()-1);
        if (isDate(yesterday)) {
            return "Yesterday";
        }

        return dateObj.toLocaleString('en-US', {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    },
    templateHelper: function (template, obj) {
        let html = template;
        if (obj !== undefined) {
            for (const [key, value] of Object.entries(obj)) {
                html = html.replaceAll("%" + key + "%", value);
            }
        }
        return html;
    },
    selectFolder: function (excludedFolder) {
        return new Promise((resolve, reject) => {
            let cache = new Map();
            const getFolderDisplayName = function (folder) {
                if (cache.has(folder.id)) {
                    return cache.get(folder.id) + " > " + folder.name;
                }
                let parentFolder = Util.getFolder(folder.parent);
                return (parentFolder !== undefined ? getFolderDisplayName(parentFolder) + " > " : "") + folder.name;
            };
            const genericInput = Email.UI.Resource.currentParents.reduce((aggregate, folder) => {
                if (folder.id === excludedFolder || folder.id === Email.UI.Resource.parent) {
                    return aggregate;
                }
                return aggregate + `<option value="${folder.id}">${getFolderDisplayName(folder)}</option>`;
            }, "<select id='generic_input'><option value='-1'></option>");
            ModalMenu.open({
                id: "move_to_folder",
                template: "generic_input_template",
                names: {
                    input_label: "Destination folder",
                    generic_input: genericInput + "</select>",
                    save_button_name: "Move"
                },
                buttons: {
                    save: function (folder_id) {
                        resolve(parseInt(folder_id));
                    }
                },
                onCloseCallback: function () {
                    resolve(undefined);
                }
            });
        });
    },
    setFolder: function (folderId) {
        Email.UI.Resource.parent = parseInt(folderId);
        Email.UI.buildBreadcrumbs();
        Email.UI.buildTable();
    },
    getContactString: function (contactIds) {
        return contactIds.map(contactId => Master.Storage.contacts.find(c => c.id === contactId).displayName).join(", ");
    },
    getContactIdsFromNames: function (recipientString) {
        let emailRecipientStrings = recipientString.split(", ");
        let emailRecipientIds = [];
        for (let i = 0; i < emailRecipientStrings.length; i++) {
            let repString = emailRecipientStrings[i].toLowerCase();
            let foundContact = Master.Storage.contacts.find(c => c.displayName.toLowerCase() === repString);
            if (foundContact !== undefined) {
                emailRecipientIds.push(foundContact.id);
            } else {
                let names = repString.split(" ");
                let newContact = new Class.Contact(names[0], names.length === 2 ? names[1] : "");
                Master.Storage.contacts.push(newContact);
                emailRecipientIds.push(newContact.id);
            }
        }
        return emailRecipientIds;
    },
    getUnique: function (list) {
        return list.filter((value, index, self) => self.indexOf(value) === index);
    },
    generateContacts: function (numberContacts) {
        const first_names = [
            "Daniel", "Beatrice", "Shelly", "Mark", "Katrina", "Ava", "Anna", "Jaime", "Connor", "Shawn",
            "Michael", "Holly", "Eric", "Will", "Shafqat", "Saim", "Sree", "Srijan", "Navya", "Audrey", "Adrienne"
        ];
        const last_names = [
            "Reyes", "Davis", "Ingram", "Tickle", "Brewer", "Wright", "Ali", "Erwin", "Johnson", "Ledbetter", "Redding", 
            "Singleton", "McGowan", "Akin", "Anderson", "Bell", "Darling", "Henley", "Hicks", "Landers", "Pearson"
        ];
        
        for (let i = 0; i < numberContacts; i++) {
            let contact = new Class.Contact(first_names[Math.floor(Math.random() * first_names.length)], last_names[Math.floor(Math.random() * last_names.length)]);
            Master.Storage.contacts.push(contact);
        }
    },
    generateEmails: function (numberEmails) {
        const words = [
            "apple", "banana", "cherry", "dog", "elephant", "fish", "guitar", "house", "island", "jungle",
            "kangaroo", "lemon", "mountain", "notebook", "ocean", "piano", "quilt", "rainbow", "sunshine", "tiger",
            "umbrella", "volcano", "whale", "xylophone", "yogurt", "zebra", "adventure", "butterfly", "candle", "diamond",
            "echo", "fireworks", "glacier", "horizon", "infinity", "jigsaw", "koala", "lighthouse", "moonlight", "nebula",
            "octopus", "penguin", "quasar", "rocket", "starfish", "treasure", "universe", "voyage", "waterfall", "zeppelin",
            "almond", "bubble", "cactus", "dolphin", "emerald", "fossil", "galaxy", "harbor", "illusion", "jellyfish",
            "kiwi", "lantern", "mystery", "nectar", "opera", "parrot", "quicksand", "ripple", "sapphire", "tornado",
            "utopia", "vortex", "windmill", "xenon", "yacht", "zephyr", "amethyst", "breeze", "crystal", "dragonfly",
            "evergreen", "feather", "gondola", "hummingbird", "iris", "jasmine", "kaleidoscope", "lullaby", "meadow", "nirvana",
            "oasis", "pebble", "quill", "raindrop", "serenity", "twilight", "umbra", "vivid", "whisper", "zenith"
        ];
        
        const getRandomWords = function (count) {
            return Array.from({ length: count }, () => words[getRandomNumber(0, words.length - 1)]).join(" ");
        };
        const getRandomContactId = function () {
            return Master.Storage.contacts[getRandomNumber(0, Master.Storage.contacts.length - 1)].id;
        };
        const getRandomNumberWords = function (min, max) {
            return getRandomWords(getRandomNumber(min, max));
        };
        const getRandomNumber = function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        
        for (let i = 0; i < numberEmails; i++) {
            let email = new Class.Email(Math.random() < 0.5, getRandomNumberWords(5, 15), getRandomNumberWords(60, 120), [0, ...Array.from({ length: getRandomNumber(1, Master.Storage.contacts.length)}, () => getRandomContactId())], -1, getRandomNumber(0, 1) === 0 ? 0 : getRandomContactId());
            Email.UI.Resource.currentItems.push(email);

            const numReplies = Math.floor(Math.random() * 5);
            for (let i = 0; i < numReplies; i++) {
                let emailReply = new Class.Email(false, getRandomNumberWords(5,15), getRandomNumberWords(60,120), email.recipients, email.parent, email.recipients[getRandomNumber(0, email.recipients.length - 1)], email.thread_id);
                Email.UI.Resource.currentItems.push(emailReply);
            }
        }
    },
    generateFolders: function (numberFolders) {
        const folderNames = [
            "Work", "School", "College", "UDA Technologies", "Relatives", "Spam", "Trash", "Junk"
        ];
        
        let folderNamesUsed = [];
        let numberFoldersMade = 0;
        let numberFoldersToMake = Math.min(numberFolders, folderNames.length);
        while (numberFoldersMade < numberFoldersToMake) {
            let folderIndex = Math.floor(Math.random() * folderNames.length);
            if (!folderNamesUsed.includes(folderIndex)) {
                folderNamesUsed.push(folderIndex);
                let folder = new Class.Folder(folderNames[folderIndex]);
                Email.UI.Resource.currentParents.push(folder);   
                numberFoldersMade++;
            }
        }
    }
};

let ModalMenu = {
    templates: {
        "new_email_template": document.getElementById("new_email_template").innerHTML,
        "generic_input_template": document.getElementById("generic_input_template").innerHTML,
        "reply_email_template": document.getElementById("reply_email_template").innerHTML
    },
    loadedModals: [],
    open: function (options) {
        var $modal;
        const modalOpen = ModalMenu.exists(options.id);
        if (modalOpen) {
            $modal = document.getElementById(options.id);
            $modal.classList.add("open");
            $modal.classList.remove("closed");
            let oldSave = $modal.querySelector("#save_button");
            oldSave.parentNode.replaceChild(oldSave.cloneNode(false), oldSave);
            let oldClose = $modal.querySelector("#close_button");
            oldClose.parentNode.replaceChild(oldClose.cloneNode(true), oldClose);
        } else {
            $modal = document.createElement("div");
            $modal.id = options.id;
            $modal.classList.add("modal-menu", "open");
            document.body.appendChild($modal);
            ModalMenu.loadedModals.push(options.id);
            $modal = document.getElementById($modal.id);
        }
        $modal.innerHTML = Util.templateHelper(ModalMenu.templates[options.template], options.names);
        if (options.item !== undefined) {
            ModalEvents[options.template].setDefaultValues($modal, options.item);
        }
        if (ModalEvents[options.template].bindEvents !== undefined) {
            ModalEvents[options.template].bindEvents($modal, options.item);
        }
        $modal.querySelector("#save_button").addEventListener("click", function (e) {
            e.stopPropagation();
            if (!ModalEvents.validateForm($modal)) {
                return false;
            }

            let returnData = ModalEvents[options.template].gatherData($modal);
            options.buttons.save(returnData);
            ModalMenu.close($modal);
        });
        $modal.querySelector("#close_button").addEventListener("click", function (e) { 
            e.stopPropagation();
            ModalMenu.close($modal, options.onCloseCallback);
        });
        if (options.onOpenCallback !== undefined) {
            options.onOpenCallback($modal);
        }
    },
    close: function ($modal, onCloseCallback) {
        if (onCloseCallback !== undefined) {
            onCloseCallback($modal);
        }
        $modal.classList.remove("open");
        $modal.classList.add("closed");
    },
    exists: function (id) {
        return ModalMenu.loadedModals.includes(id);
    }
};

let ModalEvents = {
    validateForm: function ($modal) {
        let isValid = true;
        $modal.querySelectorAll(".required").forEach($field => {
            if ($field.classList.contains("chips")) {
                if ($field.querySelector(".chips-container").childNodes.length === 0) {
                    isValid = false;
                    $field.classList.add("modal-error");
                } else {
                    $field.classList.remove("modal-error");
                }
            } else if ($field.value.trim() === "") {
                isValid = false;
                $field.classList.add("modal-error");
            } else {
                $field.classList.remove("modal-error");
            }
        });
        return isValid;
    },
    new_email_template: {
        setDefaultValues: function ($modal, email) {
            if (email === undefined) {
                $modal.querySelector("#email_modal_subject").value = "";
                $modal.querySelector("#email_modal_message").value = "";
            } else {
                $modal.querySelector("#email_modal_subject").value = email.subject;
                $modal.querySelector("#email_modal_message").value = email.message;
            }
        },
        gatherData: function ($modal) {
            const data = {
                recipients: $modal.querySelector("#email_modal_recipients").materialChip("get"),
                subject: $modal.querySelector("#email_modal_subject").value,
                message: $modal.querySelector("#email_modal_message").value
            };
            return data;
        },
        bindEvents: function ($modal, email) {
            $modal.querySelector("textarea").addEventListener("input", function () {
                this.style.height = "auto";
                this.style.height = Math.min(this.scrollHeight + 5, "450") + "px";
            });
            $modal.querySelector("#email_modal_recipients").materialChip({
                data: Master.Storage.contacts.map(c => {
                    return {
                        id: c.id,
                        label: c.displayName
                    }
                }),
                preselect: email?.recipients,
                single: false
            });
        }
    },
    generic_input_template: {
        setDefaultValues: function ($modal, item) {
            $modal.querySelector("#preset_value").classList.add("required");
            $modal.querySelector("#preset_value").value = item.name;
        },
        gatherData: function ($modal) {
            let element = $modal.querySelector("label").nextElementSibling;
            switch (element.tagName.toLowerCase()) {
                case "input":
                case "textarea":
                case "option":
                    return element.value;
                case "select":
                    if (element.multiple) {
                        return Array.from(element.selectedOptions).map(option => option.value);
                    }
                    return element.value;
                default:
                    return undefined;
            }
        },
    },
    reply_email_template: {
        setDefaultValues: function ($modal, item) {

        },
        gatherData: function ($modal) {
            const data = {
                subject: $modal.querySelector("#response_subject").value,
                message: $modal.querySelector("#response_message").value
            };
            return data;
        }
    }
};

let Confirmation = {
    template: document.getElementById("confirmation_template").innerHTML,
    open: function (options) {
        let html = Util.templateHelper(Confirmation.template, {
            title: options.title,
            description: options.description,
            approve_message: options.approve_message
        });
        let confirmationModal = document.createElement("div");
        confirmationModal.innerHTML = html;
        confirmationModal.id = options.id;
        document.body.append(confirmationModal);

        let $confirmation = document.getElementById(options.id);
        const postCallback = function (wasApproved) {
            options.callback(wasApproved);
            $confirmation.remove();
        };
        $confirmation.querySelector("#approve_button").addEventListener("click", e => postCallback(true));
        $confirmation.querySelector("#cancel_button").addEventListener("click", e => postCallback(false));
    }
};

let EmptyView = {
    template: document.getElementById("empty_view_template").innerHTML,
    create: function (options) {
        let html = (options.prependedHtml ?? "") + Util.templateHelper(EmptyView.template, options.names);
        options.$container.innerHTML = html;
        if (options.create) {
            let $emptyViewCreate = options.$container.querySelector(".empty-view-new");
            $emptyViewCreate.addEventListener("click", options.create);
        }
    }
};

let Dropdowns = {
    email_row_dropdown: {
        new_email: function (id) {
            ModalMenu.open({
                id: "new_email",
                template: "new_email_template",
                context: "new",
                item: undefined,
                names: {
                    save_button_name: "Create"
                },
                buttons: {
                    save: function (data) {
                        let email = new Class.Email(false, data.subject, data.message, data.recipients, -1, 0);
                        Email.UI.Resource.currentItems.push(email);
                        Email.UI.buildTable();
                        Ignite.toast("Email sent", 3000);
                    }
                }
            });
        },
        edit_email: function (id) {
            let email = Util.getEmail(id);
            ModalMenu.open({
                id: "edit_email",
                template: "new_email_template",
                context: "edit",
                item: email,
                names: {
                    save_button_name: "Save"
                },
                buttons: {
                    save: function (data) {
                        email.updateRecipients(data.recipients);
                        email.subject = data.subject;
                        email.message = data.message;
                        Email.UI.updateEmailRowValues(email);
                    }
                }
            });
        },
        reply: function (id) {
            let email = Util.getEmail(id);
            ModalMenu.open({
                id: "reply_email",
                template: "reply_email_template",
                item: email,
                names: {
                    subject: email.subject,
                    message: email.message
                },
                buttons: {
                    save: function (data) {
                        let replyEmail = new Class.Email(false, data.subject, data.message, email.recipients, email.parent, 0, email.thread_id);
                        Email.UI.Resource.currentItems.push(replyEmail);
                        if (!Email.UI.Elements.email_preview.classList.contains("hidden")) {
                            Email.UI.showEmailPreview(email.id);
                        }
                    }
                }
            });
        },
        create_folder: function (id) {
            ModalMenu.open({
                id: "create_folder_menu",
                template: "generic_input_template",
                names: {
                    input_label: "Folder Name",
                    generic_input: "<input></input>",
                    save_button_name: "Create"
                },
                buttons: {
                    save: function (folder_name) {
                        let folder = new Class.Folder(folder_name, Email.UI.Resource.parent);
                        Email.UI.Resource.currentParents.push(folder);
                        Email.UI.buildTable();
                    }
                }
            })
        },
        move_to_folder: function (ids) {
            Util.selectFolder(Email.UI.Resource.parent).then(folderSelection => {
                if (folderSelection !== undefined && folderSelection !== Email.UI.Resource.parent) {
                    ids.forEach(id => {
                        let email = Util.getEmail(id);
                        email.parent = folderSelection;
                        Email.UI.buildTable();
                    });
                }
            });
        },
        mark_read: function (ids) {
            ids.forEach(id => {
                let email = Util.getEmail(id);
                email.is_read = true;
                Email.UI.updateEmailRowValues(email);
            });
        },
        mark_unread: function (ids) {
            ids.forEach(id => {
                let email = Util.getEmail(id);
                email.is_read = false;
                Email.UI.updateEmailRowValues(email);
            });
        },
        delete_email: function (ids) {
            Confirmation.open({
                id: "confirmation_delete_email",
                title: "Delete email(s)",
                description: "Are you sure you want to delete " + (ids.length > 1 ? "these emails" : "this email") + "?",
                approve_message: "Delete",
                callback: function (wasApproved) {
                    if (wasApproved) {
                        Email.UI.Resource.currentItems = Email.UI.Resource.currentItems.filter(email => !ids.includes(email.id.toString()));
                        ids.forEach(id => {
                            Class.Email.delete(id);
                        });
                        Email.UI.buildTable();
                    }
                }
            });
        }
    },
    folder_row_dropdown: {
        create_folder: function (id) {
            Dropdowns.email_row_dropdown.create_folder();
        },
        edit_folder_name: function (id) {
            let folder = Util.getFolder(id);
            ModalMenu.open({
                id: "edit_folder_name",
                template: "generic_input_template",
                item: folder,
                names: {
                    input_label: "Folder Name",
                    generic_input: "<input id='preset_value'></input>",
                    save_button_name: "Save"
                },
                buttons: {
                    save: function (folder_name) {
                        folder.name = folder_name;
                    }
                }
            });
        },
        move_to_folder: function (id) {
            let folder = Util.getFolder(id);
            Util.selectFolder(folder.id).then(folderSelection => {
                if (folderSelection !== undefined && folderSelection !== Email.UI.Resource.parent) {
                    folder.parent = folderSelection;
                    Email.UI.deleteRow(id, false);
                }
            });
        },
        open_folder: function (id) {
            Util.setFolder(id);
        },
        delete_folder: function (id) {
            Confirmation.open({
                id: "confirmation_delete_folder",
                title: "Delete folder",
                description: "Are you sure you want to delete this folder?",
                approve_message: "Delete",
                callback: function (wasApproved) {
                    if (wasApproved) {
                        Ignite.toast("Folder deleted", 3000);
                        Email.UI.Resource.currentParents = Email.UI.Resource.currentParents.filter(folder => folder.id != id);
                        Email.UI.deleteRow(id, false);
                        Class.Folder.delete(id);
                    }
                }
            });
        }
    }
};

let Ignite = {
    load: function () {
        Ignite.Toast.$container = document.getElementById("ignite_toast_container");
    },
    Toast: {
        active: [],
        $container: undefined,
        remove: function (toastId) {
            const toastIndex = this.active.findIndex(t => t.id === toastId);

            if (toastIndex !== -1) {
                const $toast = this.active[toastIndex].$toast;
                $toast.classList.add("zero-opacity");
                $toast.addEventListener("transitionend", () => {
                    $toast.remove();
                    this.active.splice(toastIndex, 1);
                }, { once: true });
            }
        },
        removeAll: function () {
            this.$container.innerHTML = "";
            this.active = [];
        },
    },
    toast: function (message, duration) {
        const toastId = this.Toast.active.length;
        Ignite.Toast.$container.innerHTML += `<div class="toast" data-id="${toastId}">${message}</div>`;
        const $toast = Ignite.Toast.$container.querySelector(".toast[data-id='" + toastId + "']");
        this.Toast.active.push({ id: toastId, $toast: $toast});

        const _duration = duration ?? Infinity;
        if (isFinite(duration)) {
            setTimeout(() => {
                Ignite.Toast.remove(toastId);
            }, _duration);
        }
    }
};

window.onload = function () {
    Email.load();
    Ignite.load();
};
