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
}

const Class = {};
Class.Email = class extends idHandler {
    constructor (is_read, subject, message, recipients) {
        super();
        this.id = Class.Email.getNextId();
        Class.Email.ids[this.id] = true;
        this.is_read = is_read;
        this.subject = subject;
        this.message = message;
        this.updateRecipients(recipients);
    }

    updateRecipients (recipients) {
        this.recipients = Util.getUnique(recipients);
        this.recipients_string = Util.getContactString(this.recipients);
    }
}
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

let Master = {};
Master.Storage = {
    contacts: []
};

let Email = {};
Email.load = function  () {
    Util.generateContacts(10);
    Util.generateEmails(15);
    Email.UI.init();
};

Email.UI = {
    resource: {
        currentItems: [],
        sortDir: "asc",
        sortType: "is_read"
    },
    templates: {
        rowTemplate: document.getElementById("row_template").innerHTML,
        emailPreviewTemplate: document.getElementById("email_preview_template").innerHTML
    },
    init: function () {
        this.buildTable();
    },
    buildTable: function () {
        Util.sortResources();
        let html = Email.UI.resource.currentItems.reduce((aggregate, email) => {
            return aggregate + Util.templateHelper(Email.UI.templates.rowTemplate, {
                id: email.id,
                is_read: email.is_read ? "" : "&#x2022;",
                subject: email.subject,
                message: email.message,
                recipients: email.recipients_string
            });
        }, "");
        document.getElementById("email_body").innerHTML = html;
        Email.UI.bindEvents();
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
        let email = Email.UI.resource.currentItems.find(email => email.id === emailId);
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
    deleteRow: function (emailId) {
        let $row = document.getElementById(emailId);
        $row.remove();
    }
};

let Events = {
    showDropdownOptions: function (e) {
        e.preventDefault();

        let email = Email.UI.resource.currentItems.find(email => email.id == e.target.parentElement.id);
        let dropdownId = e.target.parentElement.dataset.activates;
        let $dropdown = document.getElementById(dropdownId);
        $dropdown.style.display = "block";
        $dropdown.style.top = e.clientY + "px";
        $dropdown.style.left = (e.clientX + 10) + "px";
        $dropdown.dataset.read = email.is_read;

        const closeDropdown = function (event) {
            $dropdown.style.display = "none";
            document.removeEventListener("click", closeDropdown)
        }
        document.addEventListener("click", closeDropdown);

        const handleDropdownClick = function (event) {
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
        Email.UI.showEmailPreview(parseInt(emailId));
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
            if (sortType !== "read" && Email.UI.resource.sortDir === "desc") {
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
    }
};

let Util = {
    templateHelper: function (template, obj) {
        let html = template;
        for (const [key, value] of Object.entries(obj)) {
            html = html.replace('%' + key + '%', value);
        }
        return html;
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
        Email.UI.resource.currentItems.sort(compareFunction);
        if (Email.UI.resource.sortDir === "desc") {
            Email.UI.resource.currentItems.reverse();
        }
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
            return Array.from({ length: count }, () => words[Math.floor(Math.random() * words.length)]).join(" ");
        }
        
        for (let i = 0; i < numberEmails; i++) {
            let email = new Class.Email(Math.random() < 0.5, getRandomWords(Math.floor(Math.random() * 11) + 5), getRandomWords(Math.floor(Math.random() * 100) + 60), Array.from({ length: Math.floor(Math.random() * 10) + 1}, () => Master.Storage.contacts[Math.floor(Math.random() * Master.Storage.contacts.length)].id));
            Email.UI.resource.currentItems.push(email);
        }
    }
};

let ModalMenu = {
    html: document.getElementById("new_email_template").innerHTML,
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
            $modal.innerHTML = ModalMenu.html;
            $modal.id = options.id;
            $modal.classList.add("modal-menu", "open");
            document.body.appendChild($modal);
            $modal = document.getElementById($modal.id);
        }
        $modal.querySelector("#save_button").innerHTML = options.email ? "Save" : "Create";
        if (options.email !== undefined) {
            $modal.querySelector("#email_modal_recipients").value = Util.getContactString(options.email.recipients);
            $modal.querySelector("#email_modal_subject").value = options.email.subject;
            $modal.querySelector("#email_modal_message").innerHTML = options.email.message;
        } else if (modalOpen) {
            $modal.querySelector("#email_modal_recipients").value = "";
            $modal.querySelector("#email_modal_subject").value = "";
            $modal.querySelector("#email_modal_message").value = "";
        }
        $modal.querySelector("textarea").addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        })
        $modal.querySelector("#save_button").addEventListener("click", function (e) {
            if (options.buttons["save"]) {
                let returnData = {
                    recipients: $modal.querySelector("#email_modal_recipients").value,
                    subject: $modal.querySelector("#email_modal_subject").value,
                    message: $modal.querySelector("#email_modal_message").value
                };
                options.buttons["save"](returnData);
            }
            ModalMenu.close($modal, options.onCloseCallback);
        });
        $modal.querySelector("#close_button").addEventListener("click", function (e) { 
            ModalMenu.close($modal, options.onCloseCallback);
        });
        if (options.onOpenCallback !== undefined) {
            options.onOpenCallback($modal);
        }
        ModalMenu.loadedModals.push(options.id);
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

let Dropdowns = {
    email_row_dropdown: {
        new_email: function (id) {
            ModalMenu.open({
                id: "new_email",
                buttons: {
                    save: function (data) {
                        let emailReps = Util.getContactIdsFromNames(data.recipients);
                        let email = new Class.Email(false, data.subject, data.message, emailReps);
                        Email.UI.resource.currentItems.push(email);
                        Email.UI.buildTable();
                    }
                }
            });
        },
        edit_email: function (id) {
            let email = Email.UI.resource.currentItems.find(email => email.id == id);
            ModalMenu.open({
                id: "edit_email",
                email: email,
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
        mark_read: function (id) {
            let email = Email.UI.resource.currentItems.find(email => email.id == id);
            email.is_read = true;
            Email.UI.rebuildRow(email);
        },
        mark_unread: function (id) {
            let email = Email.UI.resource.currentItems.find(email => email.id == id);
            email.is_read = false;
            Email.UI.rebuildRow(email);
        },
        delete_email: function (id) {
            Email.UI.resource.currentItems = Email.UI.resource.currentItems.filter(email => email.id != id);
            Email.UI.deleteRow(id);
        }
    }
};

window.onload = function () {
    Email.load();
};
