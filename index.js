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

const Class = {};
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
        this.folder_id = folder_id ?? -1;
        this.updateRecipients(recipients);
    }

    updateRecipients (recipients) {
        this.recipients = Util.getUnique(recipients);
        this.recipients_string = Util.getContactString(this.recipients);
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
    resource: {
        currentItems: [],
        currentFolder: -1,
        filteredItems: [],
        filteredFolders: [],
        folders: [],
        sortDir: "asc",
        sortType: "is_read"
    },
    templates: {
        breadcrumbs: document.getElementById("breadcrumb_template").innerHTML,
        emailPreviewTemplate: document.getElementById("email_preview_template").innerHTML,
        rowTemplate: document.getElementById("row_template").innerHTML
    },
    init: function () {
        this.buildTable();
    },
    buildTable: function () {
        Util.filterResources();
        Util.sortResources();
        let html = "";
        html += Email.UI.resource.filteredFolders.reduce((aggregate, folder) => {
            return  aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                id: folder.id,
                activates: "folder_row_dropdown",
                is_folder: 1,
                is_read: "&#128193;",
                subject: "",
                message: folder.name,
                recipients: ""
            });
        }, "");
        html += Email.UI.resource.filteredItems.reduce((aggregate, email) => {
            return aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                id: email.id,
                activates: "email_row_dropdown",
                is_folder: 0,
                is_read: email.is_read ? "" : "&#x2022;",
                subject: email.subject,
                message: email.message,
                recipients: email.recipients_string
            });
        }, "");

        if (Email.UI.resource.filteredItems.length === 0) {
            document.getElementById("email_header").classList.add("hidden");
            EmptyView.create({
                $container: document.getElementById("email_body"),
                names: {
                    title: "No Emails",
                    message: Email.UI.resource.currentFolder !== -1 ? `No emails in folder ${Util.getFolder(Email.UI.resource.currentFolder).name}.` : "You have no emails.",
                    create_new_description: "Send Email"
                },
                create: function () {
                    Dropdowns.email_row_dropdown.new_email();
                }
            });
        } else {
            document.getElementById("email_header").classList.remove("hidden");
            document.getElementById("email_body").innerHTML = html;
            Email.UI.bindEvents();
        }
    },
    buildBreadcrumbs: function () {
        let folderPath = [];
        let currentFolder = Util.getFolder(Email.UI.resource.currentFolder);
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
            document.getElementById("email_header").querySelectorAll(".column").forEach($emailColumn => {
                $emailColumn.removeEventListener("click", Events.applySort);
                $emailColumn.addEventListener("click", Events.applySort);
            });
            document.querySelectorAll("#email_body .table-row").forEach($emailRow => {
                $emailRow.removeEventListener("click", Events.showEmailPreview);
                $emailRow.removeEventListener("contextmenu", Events.showDropdownOptions);
                $emailRow.addEventListener("click", Events.showEmailPreview);
                $emailRow.addEventListener("contextmenu", Events.showDropdownOptions);
            });
        } else {
            let $emailRow = document.getElementById(emailId);
            $emailRow.addEventListener("click", Events.showEmailPreview);
            $emailRow.addEventListener("contextmenu", Events.showDropdownOptions);
        }
    },
    showEmailPreview: function (emailId) {
        let email = Util.getEmail(emailId);
        email.is_read = true;
        let emailHtml = Util.templateHelper(Email.UI.templates.emailPreviewTemplate, {
            recipients: email.recipients_string,
            subject: email.subject,
            message: email.message
        });
        let $emailPreviewWindow = document.getElementById("email_preview");
        $emailPreviewWindow.innerHTML = emailHtml;
        $emailPreviewWindow.style.display = "block";
        Email.UI.rebuildRow(email);
    },
    rebuildRow: function (email) {
        let $row = document.getElementById(email.id);
        $row.outerHTML = Util.templateHelper(Email.UI.templates.rowTemplate, {
            id: email.id,
            is_read: email.is_read ? "" : "&#x2022;",
            recipients: email.recipients_string,
            subject: email.subject,
            message: email.message
        });
        Email.UI.bindEvents(email.id);
    },
    deleteRow: function (id) {
        let $row = document.getElementById(id);
        $row.remove();
    }
};

let Events = {
    showDropdownOptions: function (e) {
        e.preventDefault();

        let dropdownId = e.target.parentElement.dataset.activates;
        let $dropdown = document.getElementById(dropdownId);
        $dropdown.style.display = "block";
        $dropdown.style.top = e.clientY + "px";
        $dropdown.style.left = (e.clientX + 10) + "px";
        document.querySelectorAll(`ul:not(#${dropdownId})`).forEach($otherDropdown => {
            $otherDropdown.style.display = "none";
        });

        let item = dropdownId === "email_row_dropdown" ? Util.getEmail(e.target.parentElement.id) : Util.getFolder(e.target.parentElement.id);
        for (const [key, value] of Object.entries(item)) {
            $dropdown.dataset[key] = value;
        }

        const closeDropdown = function (event) {
            $dropdown.style.display = "none";
            document.removeEventListener("click", closeDropdown)
        }
        document.addEventListener("click", closeDropdown);

        const handleDropdownClick = function (event) {
            Events.closeEmailPreview();
            Dropdowns[$dropdown.id][event.target.dataset.action](e.target.parentElement.id);
            Array.from($dropdown.children).forEach(dropdownOption => {
                dropdownOption.removeEventListener("click", handleDropdownClick);
            });
        }
        Array.from($dropdown.children).forEach(dropdownOption => {
            dropdownOption.addEventListener("click", handleDropdownClick);
        });
    },
    showEmailPreview: function (e) {
        const emailId = e.target.parentElement.id;
        Email.UI.showEmailPreview(emailId);
    },
    closeEmailPreview: function (e) {
        document.getElementById("email_preview").style.display = "none";
    },
    applySort: function (e) {
        const $header = e.target.parentElement;
        $header.querySelectorAll(".column span").forEach($arrow => {
            $arrow.style.display = "none";
            $arrow.style.transform = "none";
        });
        const sortType = e.target.dataset.sort;
        if (sortType === Email.UI.resource.sortType) {
            if (Email.UI.resource.sortDir === "desc") {
                Email.UI.resource.sortType = "is_read";
                Email.UI.resource.sortDir = "asc";
            } else {
                Email.UI.resource.sortDir = Email.UI.resource.sortDir === "" ? "asc" : "desc";
            }
        } else {
            Email.UI.resource.sortType = sortType;
            Email.UI.resource.sortDir = "asc";
        }
        let $arrow = $header.querySelector(`.column[data-sort="${Email.UI.resource.sortType}"] span`);
        $arrow.style.display = "inline-block";
        if (Email.UI.resource.sortDir === "desc") {
            $arrow.style.transform = "rotate(180deg)";
        }
        Util.sortResources();
        Email.UI.buildTable();
    },
    switchFolder: function (e) {
        let folderId = e.target.parentElement.dataset.id;
        Util.setFolder(folderId);
    }
};

let Util = {
    getEmail: function (id) {
        return Email.UI.resource.currentItems.find(email => email.id == id);
    },
    getFolder: function (id) {
        if (id === undefined) {
            return undefined;
        }
        return Email.UI.resource.folders.find(folder => folder.id == id);
    },
    templateHelper: function (template, obj) {
        let html = template;
        for (const [key, value] of Object.entries(obj)) {
            html = html.replace('%' + key + '%', value);
        }
        return html;
    },
    filterResources: function () {
        Email.UI.resource.filteredItems = Email.UI.resource.currentItems.filter(email => email.folder_id == Email.UI.resource.currentFolder);
        Email.UI.resource.filteredFolders = Email.UI.resource.folders.filter(folder => folder.parent == Email.UI.resource.currentFolder);
    },
    sortResources: function () {
        let compareFunction;
        if (Email.UI.resource.sortType === "recipients_string" || Email.UI.resource.sortType === "subject" || Email.UI.resource.sortType === "message") {
            compareFunction = function (a, b) {
                return a[Email.UI.resource.sortType].localeCompare(b[Email.UI.resource.sortType]);
            }
        } else {
            compareFunction = function (a, b) {
                return a[Email.UI.resource.sortType] - b[Email.UI.resource.sortType];
            }
        }
        Email.UI.resource.filteredItems.sort(compareFunction);
        Email.UI.resource.filteredFolders.sort(function (a,b) {
            return a.name.localeCompare(b.name);
        });
        if (Email.UI.resource.sortDir === "desc") {
            Email.UI.resource.filteredItems.reverse();
            Email.UI.resource.filteredFolders.reverse();
        }
    },
    selectFolder: function (excludedFolder) {
        return new Promise((resolve, reject) => {
            let genericInput = Email.UI.resource.filteredFolders.reduce((aggregate, folder) => {
                if (folder.id === excludedFolder) {
                    return aggregate;
                }
                return aggregate + `<option value="${folder.id}">${folder.name}</option>`;
            }, "<select id='generic_input'>");
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
                        resolve(folder_id);
                    }
                },
                onCloseCallback: function () {
                    resolve(undefined);
                }
            });
        });
    },
    setFolder: function (folderId) {
        Email.UI.resource.currentFolder = folderId;
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
            Email.UI.resource.currentItems.push(email);
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
                Email.UI.resource.folders.push(folder);   
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
        ModalEvents[options.template].bindEvents($modal);
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
                    return element.value;
                case "select":
                    if (element.multiple) {
                        return Array.from(element.selectedOptions).map(option => option.value);
                    }
                    return element.value;
                case "option":
                    return element.value;
                default:
                    return undefined;
            }
        },
        bindEvents: function ($modal) {
            
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
        let html = Util.templateHelper(EmptyView.template, options.names);
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
                        Email.UI.resource.currentItems.push(email);
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
                        Email.UI.rebuildRow(email);
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
                        let folder = new Class.Folder(folder_name, Email.UI.resource.currentFolder);
                        Email.UI.resource.folders.push(folder);
                        Email.UI.buildTable();
                    }
                }
            })
        },
        move_to_folder: function (id) {
            let email = Util.getEmail(id);
            Util.selectFolder(email.folder_id).then(folderSelection => {
                if (folderSelection !== undefined) {
                    email.folder_id = folderSelection;
                    Email.UI.deleteRow(id);
                }
            });
        },
        mark_read: function (id) {
            let email = Util.getEmail(id);
            email.is_read = true;
            Email.UI.rebuildRow(email);
        },
        mark_unread: function (id) {
            let email = Util.getEmail(id);
            email.is_read = false;
            Email.UI.rebuildRow(email);
        },
        delete_email: function (id) {
            Confirmation.open({
                id: "confirmation_delete_email",
                title: "Delete email",
                description: "Are you sure you want to delete this email?",
                approve_message: "Delete",
                callback: function (wasApproved) {
                    if (wasApproved) {
                        Email.UI.resource.currentItems = Email.UI.resource.currentItems.filter(email => email.id != id);
                        Email.UI.deleteRow(id);
                        Class.Email.delete(id);
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
                    generic_input: `<input id="preset_value"></input>`,
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
                if (folderSelection !== undefined) {
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
                        Email.UI.resource.folders = Email.UI.resource.folders.filter(folder => folder.id != id);
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
