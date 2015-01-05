'use strict';

var $ = require('jquery');

var Select3 = require('./select3-base');

/**
 * MultipleSelect3 Constructor.
 *
 * @param options Options object. Accepts all options from the Select3 Base Constructor.
 */
function MultipleSelect3(options) {

    Select3.call(this, options);

    this.$el.html(this.template('multipleSelectInput'));

    this._$input = this.$('.select3-multiple-input:not(.select3-width-detector)');

    this._highlightedItemId = null;

    this._rerenderSelection();
}

MultipleSelect3.prototype = Object.create(Select3.prototype);
MultipleSelect3.prototype.constructor = MultipleSelect3;

/**
 * Methods.
 */
$.extend(MultipleSelect3.prototype, {

    /**
     * Adds an item to the selection, if it's not selected yet.
     *
     * @param item The item to add. May be an item with 'id' and 'text' properties or just an ID.
     */
    add: function(item) {

        if (Select3.isValidId(item)) {
            if (this._value.indexOf(item) === -1) {
                this._value.push(item);

                if (this.options.initSelection) {
                    this.options.initSelection([item], function(data) {
                        if (this._value.lastIndexOf(item) > -1) {
                            item = this.validateItem(data[0]);
                            this._data.push(item);

                            this.triggerChange({ added: item });
                        }
                    }.bind(this));
                } else {
                    item = this.getItemForId(item);
                    this._data.push(item);

                    this.triggerChange({ added: item });
                }
            }
        } else {
            item = this.validateItem(item);
            if (this._value.indexOf(item.id) === -1) {
                this._data.push(item);
                this._value.push(item.id);

                this.triggerChange({ added: item });
            }
        }
    },

    /**
     * Events map.
     *
     * Follows the same format as Backbone: http://backbonejs.org/#View-delegateEvents
     */
    events: {
        'change': '_rerenderSelection',
        'click': '_clicked',
        'click .select3-multiple-selected-item-remove': '_itemRemoveClicked',
        'click .select3-multiple-selected-item': '_itemClicked',
        'keydown .select3-multiple-input': '_keyHeld',
        'keyup .select3-multiple-input': '_keyReleased',
        'paste .select3-multiple-input': function() {
            setTimeout(this.search.bind(this), 10);
        },
        'select3-selected': '_resultSelected'
    },

    /**
     * @inherit
     */
    filterResults: function(results) {

        return results.filter(function(item) {
            return !Select3.findById(this._data, item.id);
        }, this);
    },

    /**
     * Applies focus to the input.
     */
    focus: function() {

        this._$input.focus();
    },

    /**
     * Returns the correct data for a given value.
     *
     * @param value The value to get the data for. Should be an array of IDs.
     *
     * @return The corresponding data. Will be an array of objects with 'id' and 'text' properties.
     *         Note that if no items are defined, this method assumes the text labels will be equal
     *         to the IDs.
     */
    getDataForValue: function(value) {

        return value.map(this.getItemForId.bind(this)).filter(function(item) { return !!item; });
    },

    /**
     * Returns the correct value for the given data.
     *
     * @param data The data to get the value for. Should be an array of objects with 'id' and 'text'
     *             properties.
     *
     * @return The corresponding value. Will be an array of IDs.
     */
    getValueForData: function(data) {

        return data.map(function(item) { return item.id; });
    },

    /**
     * Removes an item from the selection, if it is selected.
     *
     * @param item The item to remove. May be an item with 'id' and 'text' properties or just an ID.
     */
    remove: function(item) {

        var id = ($.type(item) === 'object' ? item.id : item);

        var removedItem;
        var index = Select3.findIndexById(this._data, id);
        if (index > -1) {
            removedItem = this._data[index];
            this._data.splice(index, 1);
        }

        index = this._value.indexOf(id);
        if (index > -1) {
            this._value.splice(index, 1);
        }

        if (removedItem) {
            this.triggerChange({ removed: removedItem });
        }

        if (id === this._highlightedItemId) {
            this._highlightedItemId = null;
        }
    },

    /**
     * @inherit
     *
     * @param options Options object. In addition to the options supported in the base
     *                implementation, this may contain the following property:
     *                backspaceHighlightsBeforeDelete - If set to true, when the user enters a
     *                                                  backspace while there is no text in the
     *                                                  search field but there are selected items,
     *                                                  the last selected item will be highlighted
     *                                                  and when a second backspace is entered the
     *                                                  item is deleted. If false (the default),
     *                                                  the item gets deleted on the first
     *                                                  backspace.
     */
    setOptions: function(options) {

        Select3.prototype.setOptions.call(this, options);

        $.each(options, function(key, value) {
            switch (key) {
            case 'backspaceHighlightsBeforeDelete':
                if ($.type(value) !== 'boolean') {
                    throw new Error('backspaceHighlightsBeforeDelete must be a boolean');
                }
                break;
            }
        }.bind(this));
    },

    /**
     * Validates data to set. Throws an exception if the data is invalid.
     *
     * @param data The data to validate. Should be an array of objects with 'id' and 'text'
     *             properties.
     *
     * @return The validated data. This may differ from the input data.
     */
    validateData: function(data) {

        if (data === null) {
            return [];
        } else if ($.type(data) === 'array') {
            return data.map(this.validateItem.bind(this));
        } else {
            throw new Error('Data for MultiSelect3 instance should be array');
        }
    },

    /**
     * Validates a value to set. Throws an exception if the value is invalid.
     *
     * @param value The value to validate. Should be an array of IDs.
     *
     * @return The validated value. This may differ from the input value.
     */
    validateValue: function(value) {

        if (value === null) {
            return [];
        } else if ($.type(value) === 'array') {
            if (value.every(Select3.isValidId)) {
                return value;
            } else {
                throw new Error('Value contains invalid IDs');
            }
        } else {
            throw new Error('Value for MultiSelect3 instance should be an array');
        }
    },

    /**
     * @private
     */
    _backspacePressed: function() {

        if (this.options.backspaceHighlightsBeforeDelete) {
            if (this._highlightedItemId) {
                this._deletePressed();
            } else if (this._value.length) {
                this._highlightItem(this._value.slice(-1)[0]);
            }
        } else if (this._value.length) {
            this.remove(this._value.slice(-1)[0]);
        }
    },

    /**
     * @private
     */
    _clicked: function() {

        this.focus();

        if (this.options.showDropdown !== false) {
            this.open();
        }

        return false;
    },

    /**
     * @private
     */
    _deletePressed: function() {

        if (this._highlightedItemId) {
            this.remove(this._highlightedItemId);
        }
    },

    /**
     * @private
     */
    _highlightItem: function(id) {

        this._highlightedItemId = id;
        this.$('.select3-multiple-selected-item').removeClass('highlighted')
            .filter('[data-item-id=' + Select3.quoteCssAttr(id) + ']').addClass('highlighted');

        if (this.hasKeyboard) {
            this.focus();
        }
    },

    /**
     * @private
     */
    _itemClicked: function(event) {

        this._highlightItem(this._getItemId(event));
    },

    /**
     * @private
     */
    _itemRemoveClicked: function(event) {

        this.remove(this._getItemId(event));

        this._updateInputWidth();

        return false;
    },

    /**
     * @private
     */
    _keyHeld: function(event) {

        this._originalValue = this._$input.val();

        if (event.keyCode === Select3.Keys.DOWN_ARROW) {
            if (this.dropdown) {
                this.dropdown.highlightNext();
            }
        } else if (event.keyCode === Select3.Keys.UP_ARROW) {
            if (this.dropdown) {
                this.dropdown.highlightPrevious();
            }
        }
    },

    /**
     * @private
     */
    _keyReleased: function(event) {

        var dropdown = this.dropdown, inputHadText = !!this._originalValue;

        if (event.keyCode === Select3.Keys.ENTER && !event.ctrlKey) {
            if (dropdown) {
                dropdown.clickHighlight();
                this._$input.val('');
            }
        } else if (event.keyCode === Select3.Keys.BACKSPACE && !inputHadText) {
            this._backspacePressed();
        } else if (event.keyCode === Select3.Keys.DELETE && !inputHadText) {
            this._deletePressed();
        } else if (event.keyCode === Select3.Keys.ESCAPE) {
            this.close();
        } else if (event.keyCode === Select3.Keys.DOWN_ARROW ||
                   event.keyCode === Select3.Keys.UP_ARROW) {
            // handled in _keyHeld() because the response feels faster and it works with repeated
            // events if the user holds the key for a longer period
            // still, we issue an open() call here in case the dropdown was not yet open...
            this.open();
        } else {
            this.open();

            this._search();
        }

        this._updateInputWidth();

        return false;
    },

    /**
     * @private
     */
    _rerenderSelection: function(event) {

        event = event || {};

        var $input = this._$input;
        if (event.added) {
            $input.before(this.template('multipleSelectedItem', $.extend({
                highlighted: (event.added.id === this._highlightedItemId)
            }, event.added)));

            this._scrollToBottom();
        } else if (event.removed) {
            var quotedId = Select3.quoteCssAttr(event.removed.id);
            this.$('.select3-multiple-selected-item[data-item-id=' + quotedId + ']').remove();
        } else {
            this.$('.select3-multiple-selected-item').remove();

            this._data.forEach(function(item) {
                $input.before(this.template('multipleSelectedItem', $.extend({
                    highlighted: (item.id === this._highlightedItemId)
                }, item)));
            }, this);
        }

        if (event.added || event.removed) {
            if (this.dropdown) {
                this.dropdown.showResults(this.filterResults(this.results), {
                    hasMore: this.dropdown.hasMore
                });
            }

            if (this.hasKeyboard) {
                this.focus();
            }
        }

        this.positionDropdown();

        $input.attr('placeholder', this._data.length ? '' : this.options.placeholder);
    },

    /**
     * @private
     */
    _resultSelected: function(event) {

        if (this._value.indexOf(event.id) === -1) {
            this.add(event.item);
        } else {
            this.remove(event.item);
        }
    },

    /**
     * @private
     */
    _scrollToBottom: function() {

        var $inputContainer = this.$('.select3-multiple-input-container');
        $inputContainer.scrollTop($inputContainer.outerHeight());
    },

    /**
     * @private
     */
    _search: function() {

        this.search(this._$input.val());
    },

    /**
     * @private
     */
    _updateInputWidth: function() {

        var $input = this._$input, $widthDetector = this.$('.select3-width-detector');
        $widthDetector.text($input.val() || !this._data.length && this.options.placeholder || '');
        $input.width($widthDetector.width() + 20);

        this.positionDropdown();
    }

});

Select3.Implementations.Multiple = MultipleSelect3;

module.exports = MultipleSelect3;
