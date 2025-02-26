HTMLElement.prototype.bindEmailRowEvents = function () {
    const $emailRow = this;

    $emailRow.removeEventListener("click", Events.showEmailPreview);
    $emailRow.removeEventListener("contextmenu", Events.showDropdownOptions);

    $emailRow.addEventListener("click", Events.showEmailPreview);
    $emailRow.addEventListener("contextmenu", Events.showDropdownOptions);

    $emailRow.addEventListener("dragstart", Events.handleDragStart);
    $emailRow.addEventListener("dragover", Events.handleDragOver);
    $emailRow.addEventListener("dragend", Events.handleDragEnd);
};
HTMLElement.prototype.bindFolderRowEvents = function () {
    const $folderRow = this;

    $folderRow.removeEventListener("contextmenu", Events.showDropdownOptions);
    $folderRow.addEventListener("contextmenu", Events.showDropdownOptions);

    $folderRow.addEventListener("dragover", Events.handleDragOver);
    $folderRow.addEventListener("dragleave", Events.handleDragLeave);
    $folderRow.addEventListener("drop", Events.handleDrop);
};
HTMLElement.prototype.multiSelect = function(options) {
    const getAll = function () {
        return Array.from(this.querySelectorAll("[data-multi-selected='true']")).map($row => {
            return $row.dataset.id;
        });
    }.bind(this);
    const clearAll = function () {
        this.querySelectorAll("[data-multi-selected='true']").forEach($row => {
            $row.removeAttribute("data-multi-selected");
            $row.removeAttribute("data-multi-last");
        });
    }.bind(this);
    if (options === "get") {
        return getAll();
    }
    if (options === "clear") {
        clearAll();
        return;
    }
    
    let currOptions = Object.assign({}, options);
    currOptions.selectedSelector = currOptions.selector + "[data-multi-selected='true']";
    currOptions.$container.classList.add("multi-container");

    const markSelected = function ($targetRow, $lastSelected) {
        $targetRow.setAttribute("data-multi-selected", true);
        $targetRow.setAttribute("data-multi-last", true);
        if ($lastSelected !== null) {
            $lastSelected.removeAttribute("data-multi-last");        
        }
    };

    const handleClick = function (e) {
        const $lastSelected = this.querySelector(options.selector + "[data-multi-last='true']");
        const $targetRow = e.target.closest(options.selector);
        if ($lastSelected === null) {
            markSelected($targetRow, null);
            return;
        }
        if (e.shiftKey) {
            let numPasses = 0;
            let $rows = this.querySelectorAll(options.selector + "[data-multi-selectable='true']");
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
            markSelected($targetRow, $lastSelected);
        } else if (e.ctrlKey) {
            markSelected($targetRow, $lastSelected);
        } else {
            clearAll();
            markSelected($targetRow, $lastSelected);
        }
    }.bind(this);

    this.querySelectorAll(options.selector + "[data-multi-selectable='true']").forEach($row => {
        $row.addEventListener("click", handleClick);
    });
    document.addEventListener("click", e => {
        if (e.target.closest(options.selector + "[data-multi-selectable='true']") === null) {
            clearAll();
        }
    });
};

class idHandler {
    static ids = new Array(10).fill(undefined);

    static getNextId() {
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
        this.id = Class.Contact.getNextId();
        Class.Contact.ids[this.id] = true;
        this.first_name = first_name;
        this.last_name = last_name;
    }

    get displayName() {
        return this.first_name + " " + this.last_name;
    }
}
Class.Email = class extends idHandler {
    constructor (is_read, subject, message, recipients, folder_id) {
        super();
        this.id = Class.Email.getNextId();
        Class.Email.ids[this.id] = true;
        this.is_read = is_read;
        this.subject = subject;
        this.message = message;
        this.parent = folder_id ?? -1;
        this.updateRecipients(recipients);
    }

    updateRecipients (recipients) {
        this.recipients = Util.getUnique(recipients);
        this.recipients_string = Util.getContactString(this.recipients);
    }

    [Symbol.iterator]() {
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
Class.Folder = class extends idHandler {
    constructor(name, parent) {
        super();
        this.id = Class.Folder.getNextId();
        Class.Folder.ids[this.id] = true;
        this.name = name;
        this.parent = parent ?? -1;
    }

    [Symbol.iterator]() {
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
Class.Resource = class {
    constructor() {
        this.currentItems = [];
        this.currentParents = [];
        this.searchText = "";
        this.sortDir = "";
        this.itemSortType = "";
        this.parentSortType = "";
        this.parent = -1;
        this.filteredItems = [];
        this.filteredParents = [];

        this.setSearch = this.setSearch.bind(this);
        Object.assign(this, EventTarget.prototype);
    }

    getSingle (id, isParent) {
        if (isParent) {
            return this.currentParents.find(p => p.id == id);
        }
        return this.currentItems.find(p => p.id == id);
    }

    getAll (callback, filter = false, filterByParent = false, sort = false, search = false, itemSearchColumn = "", parentSearchColumn = "") {
        if (filter) {
            this.filter(filterByParent, search, itemSearchColumn, parentSearchColumn);
        }
        if (sort) {
            this.sort(filter);
        }
        callback(filter ? {
            items: this.filteredItems,
            parents: this.filteredParents
        } : {
            items: this.currentItems,
            parents: this.currentParents
        });
    }

    filter (filterByParent = true, filterBySearch = true, itemSearchColumn = "", parentSearchColumn = "") {
        const matchesParent = function (item) {
            if (!filterByParent) {
                return true;
            }
            return item.parent == this.parent;
        }.bind(this);
        const matchesSearch = function (item, isParent) {
            if (!filterBySearch || this.searchText === "") {
                return true;
            }
            if (!isParent) {
                if (itemSearchColumn !== "all") {
                    return item[itemSearchColumn] && item[itemSearchColumn].toLowerCase().includes(this.searchText);
                } else {
                    for (const [key, value] of item) {
                        if (value.toString().toLowerCase().includes(this.searchText)) {
                            return true;
                        }
                    }
                }
            } else {
                if (parentSearchColumn !== "all") {
                    return item[parentSearchColumn] && item[parentSearchColumn].toLowerCase().includes(this.searchText);
                } else {
                    for (const [key, value] of item) {
                        if (value.toString().toLowerCase().includes(this.searchText)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }.bind(this);
        this.filteredItems = this.currentItems.filter(item => {
            return matchesParent(item) && matchesSearch(item, false);
        });
        this.filteredParents = this.currentParents.filter(item => {
            return matchesParent(item) && matchesSearch(item, true);
        });
    }

    sort (sortFiltered) {
        const getSortFunction = function (itemComparingType, isParent) {
            let itemComparingFunction = undefined;
            if (itemComparingType === "string") {
                itemComparingFunction = function (itemA, itemB) {
                    return itemA[isParent ? this.parentSortType : this.itemSortType].localeCompare(itemB[isParent ? this.parentSortType : this.itemSortType]);
                }.bind(this);
            } else if (itemComparingType === "number") {
                itemComparingFunction = function (itemA, itemB) {
                    return itemA[isParent ? this.parentSortType : this.itemSortType] - itemB[isParent ? this.parentSortType : this.itemSortType];
                }.bind(this);
            }
            return itemComparingFunction;
        }.bind(this);
        const sortItems = function (isParent) {
            let items = isParent ? (sortFiltered ? this.filteredParents : this.currentParents) : (sortFiltered ? this.filteredItems : this.currentItems);
            let sortType = isParent ? this.parentSortType : this.itemSortType;
            if (items.length > 0) {
                let itemComparingFunction = getSortFunction(typeof items[0][sortType], isParent);
                if (itemComparingFunction !== undefined) {
                    items.sort(itemComparingFunction);
                    if (this.sortDir === "desc") {
                        items.reverse();
                    }
                }
            }
        }.bind(this);
        sortItems(false); // sort items
        sortItems(true);  // sort parents
    }

    setSearch (e) {
        this.searchText = e.target.value.toLowerCase();
    }

    isSearching () {
        return this.searchText.trim() !== "";
    }
}

let Master = {};
Master.Storage = {
    contacts: []
};

let Email = {};
Email.load = function  () {
    Util.generateContacts(10);
    Util.generateEmails(15);
    Util.generateFolders(3);
    Email.UI.init();
};

Email.UI = {
    Elements: {
        email_body: undefined,
        email_table: undefined,
        email_preview: undefined
    },
    Resource: new Class.Resource(),
    templates: {
        breadcrumbs: document.getElementById("breadcrumb_template").innerHTML,
        emailPreviewTemplate: document.getElementById("email_preview_template").innerHTML,
        rowTemplate: document.getElementById("row_template").innerHTML
    },
    init: function () {
        this.Resource.parentSortType = "name";
        this.getContainers();
        this.buildTable();
        this.bindSingleEvents();
    },
    getContainers: function() {
        Email.UI.Elements.email_body = document.getElementById("email_body");
        Email.UI.Elements.email_table = document.getElementById("email_table");
        Email.UI.Elements.email_preview = document.getElementById("email_preview")
    },
    buildTable: function () {
        Email.UI.Resource.getAll(data => {
            let html = "";
            html += data.parents.reduce((aggregate, folder) => {
                return  aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                    id: folder.id,
                    activates: "folder_row_dropdown",
                    is_folder: 1,
                    is_read: "&#128193;",
                    subject: "",
                    message: folder.name,
                    recipients: "",
                    multi_selectable: "false"
                });
            }, "");

            if (data.items.length === 0) {
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
                        recipients: email.recipients_string,
                        multi_selectable: "true"
                    });
                }, "");

                Email.UI.Elements.email_table.querySelector("#email_header").classList.remove("hidden");
                Email.UI.Elements.email_body.innerHTML = html;
                Email.UI.bindEvents();
            }
        }, true, true, true, true, "all", "name");
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
    bindEvents: function (emailId) {
        if (emailId === undefined) {
            Email.UI.Elements.email_table.querySelector("#email_header").querySelectorAll(".column").forEach($emailColumn => {
                $emailColumn.removeEventListener("click", Events.applySort);
                $emailColumn.addEventListener("click", Events.applySort);
            });
            Email.UI.Elements.email_body.multiSelect({
                selector: ".table-row",
                $container: Email.UI.Elements.email_body
            });
            Email.UI.Elements.email_body.querySelectorAll(".table-row").forEach($tableRow => {
                if ($tableRow.dataset.isFolder === "1") {
                    $tableRow.bindFolderRowEvents();
                } else {
                    $tableRow.bindEmailRowEvents();
                }
            });
        } else {
            let $emailRow = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(emailId));
            $emailRow.bindEmailRowEvents();
        }
    },
    bindSingleEvents: function () {
        document.getElementById("search_bar").addEventListener("input", e => {
            Email.UI.Resource.setSearch(e);
            Email.UI.buildTable();
        });
    },
    showEmailPreview: function (emailId) {
        let email = Util.getEmail(emailId);
        email.is_read = true;
        let emailHtml = Util.templateHelper(Email.UI.templates.emailPreviewTemplate, {
            recipients: email.recipients_string,
            subject: email.subject,
            message: email.message
        });
        Email.UI.Elements.email_preview.innerHTML = emailHtml;
        Email.UI.Elements.email_preview.style.display = "block";
        Email.UI.markHtmlRead(email);
    },
    updateEmailRowValues: function (email) {
        let $row = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(email.id));
        $row.querySelector(".column.read").innerHTML = email.is_read ? "" : "&#x2022;";
        $row.querySelector(".column.recipients").innerHTML = email.recipients_string;
        $row.querySelector(".column.subject").innerHTML = email.subject;
        $row.querySelector(".column.message").innerHTML = email.message;
    },
    markHtmlRead: function (email) {
        let $row = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(email.id));
        $row.querySelector(".read").innerHTML = "";
    },
    deleteRow: function (id) {
        let $row = Email.UI.Elements.email_body.querySelector(Util.getIdSelector(id));
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
    showEmailPreview: function (e) {
        const emailId = e.target.closest(".table-row").dataset.id;
        Email.UI.showEmailPreview(emailId);
    },
    closeEmailPreview: function (e) {
        Email.UI.Elements.email_preview.style.display = "none";
    },
    applySort: function (e) {
        const $header = e.target.parentElement;
        $header.querySelectorAll(".column span").forEach($arrow => {
            $arrow.style.display = "none";
            $arrow.style.transform = "none";
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
        $arrow.style.display = "inline-block";
        if (Email.UI.Resource.sortDir === "desc") {
            $arrow.style.transform = "rotate(180deg)";
        }
        Email.UI.buildTable();
    },
    switchFolder: function (e) {
        let folderId = e.target.parentElement.dataset.id;
        Util.setFolder(folderId);
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
    getIdSelector: function (id) {
        return ".table-row[data-id='" + id + "']";
    },
    templateHelper: function (template, obj) {
        let html = template;
        for (const [key, value] of Object.entries(obj)) {
            html = html.replaceAll('%' + key + '%', value);
        }
        return html;
    },
    filterResources: function () {
        Email.UI.Resource.filteredItems = Email.UI.Resource.currentItems.filter(email => email.parent == Email.UI.Resource.parent);
        Email.UI.Resource.filteredParents = Email.UI.Resource.currentParents.filter(folder => folder.parent == Email.UI.Resource.parent);
    },
    sortResources: function () {
        let compareFunction;
        if (Email.UI.Resource.itemSortType === "recipients_string" || Email.UI.Resource.itemSortType === "subject" || Email.UI.Resource.itemSortType === "message") {
            compareFunction = function (a, b) {
                return a[Email.UI.Resource.itemSortType].localeCompare(b[Email.UI.Resource.itemSortType]);
            }
        } else {
            compareFunction = function (a, b) {
                return a[Email.UI.Resource.itemSortType] - b[Email.UI.Resource.itemSortType];
            }
        }
        Email.UI.Resource.filteredItems.sort(compareFunction);
        Email.UI.Resource.filteredParents.sort(function (a,b) {
            return a.name.localeCompare(b.name);
        });
        if (Email.UI.Resource.sortDir === "desc") {
            Email.UI.Resource.filteredItems.reverse();
            Email.UI.Resource.filteredParents.reverse();
        }
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
            let email = new Class.Email(Math.random() < 0.5, getRandomNumberWords(5, 15), getRandomNumberWords(60, 120), Array.from({ length: getRandomNumber(1, Master.Storage.contacts.length)}, () => getRandomContactId()), -1);
            Email.UI.Resource.currentItems.push(email);
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
        "generic_input_template": document.getElementById("generic_input_template").innerHTML
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
            ModalEvents[options.template].bindEvents($modal);
        }
        $modal.querySelector("#save_button").addEventListener("click", function (e) {
            let returnData = ModalEvents[options.template].gatherData($modal);
            options.buttons.save(returnData);
            ModalMenu.close($modal);
        });
        $modal.querySelector("#close_button").addEventListener("click", function (e) { 
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
    new_email_template: {
        setDefaultValues: function ($modal, email) {
            if (email === undefined) {
                $modal.querySelector("#email_modal_recipients").value = "";
                $modal.querySelector("#email_modal_subject").value = "";
                $modal.querySelector("#email_modal_message").value = "";
            } else {
                $modal.querySelector("#email_modal_recipients").value = email.recipients_string;
                $modal.querySelector("#email_modal_subject").value = email.subject;
                $modal.querySelector("#email_modal_message").value = email.message;
            }
        },
        gatherData: function ($modal) {
            let data = {
                recipients: $modal.querySelector("#email_modal_recipients").value,
                subject: $modal.querySelector("#email_modal_subject").value,
                message: $modal.querySelector("#email_modal_message").value
            };
            return data;
        },
        bindEvents: function ($modal) {
            $modal.querySelector("textarea").addEventListener("input", function () {
                this.style.height = "auto";
                this.style.height = Math.min(this.scrollHeight + 5, "450") + "px";
            });
        }
    },
    generic_input_template: {
        setDefaultValues: function ($modal, item) {
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
                        let recipientArray = Util.getContactIdsFromNames(data.recipients);
                        let email = new Class.Email(false, data.subject, data.message, recipientArray, -1);
                        Email.UI.Resource.currentItems.push(email);
                        Email.UI.buildTable();
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
                        let recipientArray = Util.getContactIdsFromNames(data.recipients);
                        email.updateRecipients(recipientArray);
                        email.subject = data.subject;
                        email.message = data.message;
                        Email.UI.updateEmailRowValues(email);
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
                        Email.UI.deleteRow(id);
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
                title: "Delete email",
                description: "Are you sure you want to delete this email?",
                approve_message: "Delete",
                callback: function (wasApproved) {
                    if (wasApproved) {
                        Email.UI.Resource.currentItems = Email.UI.Resource.currentItems.filter(email => !ids.contains(email.id));
                        ids.forEach(id => {
                            Email.UI.deleteRow(id);
                            Class.Email.delete(id);
                        });
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
                    Email.UI.deleteRow(id);
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
                        Email.UI.Resource.currentParents = Email.UI.Resource.currentParents.filter(folder => folder.id != id);
                        Email.UI.deleteRow(id);
                        Class.Folder.delete(id);
                    }
                }
            });
        }
    }
};

window.onload = function () {
    Email.load();
};
