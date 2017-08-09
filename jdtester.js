/*!
 * JDTester.js v0.5.0 - A small JavaScript JSON testing library
 * Copyright (c) Stas Granin - https://github.com/StasGranin/JDTester.js
 * License: MIT
 */

(function()
{
	var UNDEFINED = 'undefined',
		NULL = 'null',
		BOOLEAN = 'boolean',
		NUMBER = 'number',
		STRING = 'string',
		ARRAY = 'array',
		OBJECT = 'object',
		REGEX = 'regex',
		FUNCTION = 'function';


	/**
	 * @constructor
	 * @param {Object} schema - The schema describing the data to be tested
	 * @param {Object} [options] - Optional settings. For future use
	 */
	var JDTester = function(schema, options)
	{
		this.schema = schema;
		this.options = options || {};
		//this.options.breakOnError = this.options.breakOnError || false;
		this.errors = [];
	};

	/**
	 * The main testing function
	 * @public
	 * @param {Object} data - Data to be tested
	 */
	JDTester.prototype.test = function(data)
	{
		this.errors = [];

		this._recursiveTest(data, this.schema, 'DATA');
	};

	/**
	 * The recursive function doing the testing of each data particle
	 * @private
	 * @param {Object} data - Data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._recursiveTest = function(data, schema, path)
	{
		var typeOfSchema = realTypeOf(schema);
		var typeOfData;

		if (typeOfSchema === OBJECT)
		{
			typeOfData = realTypeOf(data);

			this._testCommon(data, schema, path);

			switch (typeOfData)
			{
				case BOOLEAN:
					this._testBoolean(data, schema, path);
					break;

				case NUMBER:
					this._testNumber(data, schema, path);
					break;

				case STRING:
					this._testString(data, schema, path);
					break;

				case ARRAY:
					this._testArray(data, schema, path);
					break;

				case OBJECT:
					this._testObject(data, schema, path);
					break;
			}
		}
		else if (typeOfSchema === FUNCTION)
		{
			this._recursiveTest(data, schema(data), path);
		}
		else
		{
			throw 'DataTester schema error: Provided schema is of invalid type. Expected object, array or function';
		}
	};

	/**
	 * Tests the common data tests (type, required, canBeNull, fn)
	 * @private
	 * @param {object} data - Data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testCommon = function(data, schema, path)
	{
		var type = getTestValue(schema.type, data);
		var canBeNull = getTestValue(schema.canBeNull, data, false);
		var required = getTestValue(schema.required, data, true);
		var fn = schema.fn;

		if (required)
		{
			if (typeof required === BOOLEAN)
			{
				data === undefined && this._pushError('Required validation failed', path, data, type || 'not undefined');
			}
			else
			{
				throw 'DataTester schema error: Boolean expected for "required" value. Got ' + typeof required;
			}
		}

		if (required || !required && data !== undefined)
		{
			if (type !== undefined)
			{
				this._testType(type, canBeNull, path, data);
			}

			if (canBeNull === false)
			{
				if (typeof canBeNull === BOOLEAN)
				{
					data === null && this._pushError('Value cannot be null', path, data, type || 'not null');
				}
				else
				{
					throw 'DataTester schema error: Boolean expected for "canBeNull" value. Got ' + typeof canBeNull;
				}
			}

			if (fn)
			{
				if (typeof fn === FUNCTION)
				{
					fn(data) === false && this._pushError('fn() validation failed', path, data, fn); // Yep, that first "fn(data) === false" could be shortened to "!fn(data)". But you know, It's more readable like that 
				}
				else
				{
					throw 'DataTester schema error: Function expected for "fn" value. Got ' + typeof fn;
				}
			}
		}
	};

	/**
	 * Tests the type of the data particles
	 * @private
	 * @param {string|Array} type - Defines the type of types the data particle can be of
	 * @param {boolean} canBeNull - Defines whether the data particle can be null
	 * @param {string} path - Dot-notation path to the tested data particle
	 * @param {*} data - Data particle to be tested
	 */
	JDTester.prototype._testType = function(type, canBeNull, path, data)
	{
		var dataType = realTypeOf(data);
		var typeOfType = realTypeOf(type); // Yep, it is a silly name for a valiable. You know that, I know that, let us continue
		var isValid = false;

		if (typeOfType === STRING || typeOfType === ARRAY)
		{
			if (canBeNull === true && dataType === NULL) // If it's null and we defined it can be as such, there's no reason to fail the test
			{
				isValid = true;
			}
			else
			{
				if (typeOfType === STRING && dataType === type)
				{
					isValid = true;
				}
				else if (typeOfType === ARRAY) // Maybe we want to allow it to be, let's say, an array AND a boolean (for some reason, I don't judge)
				{
					for (var i = 0, l = type.length; i < l; i++)
					{
						if (dataType === type[i])
						{
							isValid = true;
							break;
						}
					}
				}
			}

			isValid === false && this._pushError('Type validation failed', path, data, type);
		}
		else
		{
			throw 'DataTester schema error: String or Array expected for "type" value. Got ' + typeof type;
		}
	};

	/**
	 * Tests boolean type data particles
	 * @private
	 * @param {boolean} data - Boolean data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testBoolean = function(data, schema, path)
	{
		var value = getTestValue(schema.value, data);

		if (value !== undefined)
		{
			if (typeof value === BOOLEAN)
			{
				data !== value && this._pushError('Value validation failed', path, data, value);
			}
			else
			{
				throw 'DataTester schema error: Boolean expected for "value" value. Got ' + typeof value;
			}
		}
	};

	/**
	 * Tests number type data particles
	 * @private
	 * @param {number} data - Number data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testNumber = function(data, schema, path)
	{
		var min = getTestValue(schema.min, data);
		var max = getTestValue(schema.max, data);
		var value = getTestValue(schema.value, data);  // Hmmm... Probably should make this accept an array of values

		if (min !== undefined)
		{
			if (!isNaN(min))
			{
				if (data < min)
				{
					this._pushError('Min value validation failed', path, data, min);
				}
			}
			else
			{
				throw 'DataTester schema error: Number expected for "min" value. Got ' + typeof min;
			}
		}

		if (max !== undefined)
		{
			if (!isNaN(max))
			{
				if (data > max)
				{
					this._pushError('Max value validation failed', path, data, max);
				}
			}
			else
			{
				throw 'DataTester schema error: Number expected for "max" value. Got ' + typeof max;
			}
		}

		if (value !== undefined)
		{
			if (typeof value === NUMBER)
			{
				data !== value && this._pushError('Value validation failed', path, data, value);
			}
			else
			{
				throw 'DataTester schema error: Number expected for "value" value. Got ' + typeof value;
			}
		}
	};

	/**
	 * Tests string type data particles
	 * @private
	 * @param {string} data - String data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testString = function(data, schema, path)
	{
		var pattern = getTestValue(schema.pattern, data);
		var value = getTestValue(schema.value, data);

		if (pattern !== undefined)
		{
			if (realTypeOf(pattern) === REGEX)
			{
				if (!pattern.test(data))
				{
					this._pushError('Pattern validation failed', path, data, pattern);
				}
			}
			else
			{
				throw 'DataTester schema error: RegExp object expected for "pattern" value. Got ' + typeof pattern;
			}
		}

		if (value !== undefined)
		{
			if (typeof value === STRING)
			{
				data !== value && this._pushError('Value validation failed', path, data, value);
			}
			else
			{
				throw 'DataTester schema error: String expected for "value" value. Got ' + typeof value;
			}
		}
	};

	/**
	 * Tests array type data particles
	 * @private
	 * @param {Array} data - Array data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testArray = function(data, schema, path)
	{
		var minLength = getTestValue(schema.minLength, data);
		var maxLength = getTestValue(schema.maxLength, data);
		var allowDuplicates = getTestValue(schema.allowDuplicates, data, true);
		var elementsSchema = getTestValue(schema.elements, data);
		var allowDuplicatesType;
		var duplicates;

		if (minLength !== undefined)
		{
			if (!isNaN(minLength))
			{
				if (data.length < minLength)
				{
					this._pushError('Minimum length validation failed', path, data, minLength);
				}
			}
			else
			{
				throw 'DataTester schema error: Number expected for "minLength" value. Got ' + typeof minLength;
			}
		}

		if (maxLength !== undefined)
		{
			if (!isNaN(maxLength))
			{
				if (data.length > maxLength)
				{
					this._pushError('Maximum length validation failed', path, data, maxLength);
				}
			}
			else
			{
				throw 'DataTester schema error: Number expected for "maxLength" value. Got ' + typeof maxLength;
			}
		}

		if (allowDuplicates !== true)
		{
			allowDuplicatesType = realTypeOf(allowDuplicates);

			if (allowDuplicates === false)
			{
				duplicates = getArrayDuplicates(data);

				if (duplicates.length)
				{
					this._pushError('Duplicate values validation failed. Duplicates: [' + duplicates.join(',') + ']', path, data, false);
				}
			}
			else if (allowDuplicatesType === ARRAY)
			{
				duplicates = getArrayDuplicates(allowDuplicates);

				if (duplicates.length)
				{
					this._pushError('Duplicate values validation failed. Duplicates: [' + duplicates.join(',') + ']', path, allowDuplicates, false);
				}
			}
			else if (allowDuplicatesType === OBJECT)
			{
				for (var key in allowDuplicates)
				{
					if (allowDuplicates.hasOwnProperty(key))
					{
						if (typeof allowDuplicates[key] === FUNCTION)
						{
							duplicates = getArrayDuplicates(allowDuplicates[key](data));

							if (duplicates.length)
							{
								this._pushError('Duplicate values validation failed. Duplicates for "' + key + '": [' + duplicates.join(',') + ']', path, allowDuplicates[key], false);
							}
						}
						else
						{
							throw 'DataTester schema error: Function expected for "allowDuplicates" object value. Got ' + typeof allowDuplicates[key];
						}
					}
				}
			}
			else
			{
				throw 'DataTester schema error: Boolean, function or object expected for "maxLength" value. Got ' + allowDuplicatesType;
			}
		}

		if (elementsSchema !== undefined)
		{
			for (var i = 0, l = data.length; i < l; i++)
			{
				this._recursiveTest(data[i], elementsSchema, [path, '[', i, ']'].join(''));
			}
		}
	};

	/**
	 * Tests object type data particles
	 * @private
	 * @param {Object} data - Object data particle to be tested
	 * @param {Object} schema - The schema of the data particle to be tested
	 * @param {string} path - Dot-notation path to the tested data particle
	 */
	JDTester.prototype._testObject = function(data, schema, path)
	{
		var strictKeys = getTestValue(schema.strictKeys, data);
		var dataSchema = getTestValue(schema.data, data);

		if (strictKeys !== undefined)
		{
			if (Array.isArray(strictKeys))
			{
				if (!validateObjectKeys(data, strictKeys))
				{
					this._pushError('Strict keys validation failed. Missing or additional keys were found', path, Object.keys(data), strictKeys);
				}
			}
			else
			{
				throw 'DataTester schema error: Array expected for "strictKeys" value. Got ' + typeof strictKeys;
			}
		}

		if (dataSchema !== undefined)
		{
			if (realTypeOf(dataSchema) === OBJECT)
			{
				for (var key in dataSchema)
				{
					if (dataSchema.hasOwnProperty(key))
					{
						this._recursiveTest(data[key], dataSchema[key], [path, '.', key].join(''));
					}
				}
			}
			else
			{
				throw 'DataTester schema error: Object expected for "data" value. Got ' + realTypeOf(dataSchema);
			}
		}
	};

	/**
	 * Adds a validation error to the this.errors array
	 * @private
	 * @param {string} error - String describing the error
	 * @param {path} path - Dot-notation path to the tested data particle on witch the error had occurred
	 * @param {*} value - The invalid data particle itself
	 * @param {*} test - The test that caused the validation to fail
	 */
	JDTester.prototype._pushError = function(error, path, value, test)
	{
		var breakOnError = this.options.breakOnError;

		this.errors.push({path: path, error: error, value: value, expected: test});
	};


	/**
	 * An object containing common data schemas
	 * @public
	 */
	JDTester.common =
	{
		positiveNumber: {
			type: 'number',
			min: 0
		},
		notEmptyString: {
			type: 'string',
			fn: function(st){return st.trim() && true || false}
		}
	};

	/**
	 * @public
	 */
	JDTester.diff = recursiveDiff;



	/* --- Private Functions --- */

	// This function is not strict and will return an empty string for unsupported types
	function realTypeOf(variable)
	{
		var type = typeof variable;

		if (type === OBJECT)
		{
			if (variable === null)
			{
				return NULL;
			}
			else if (variable.constructor === Object)
			{
				return OBJECT
			}
			else if (Array.isArray(variable))
			{
				return ARRAY;
			}
			else if (variable instanceof RegExp)
			{
				return REGEX;
			}
			else
			{
				return '';
			}
		}

		return type;
	}

	function getTestValue(test, data, defaultValue)
	{
		var result = test;

		if (typeof test === FUNCTION)
		{
			return test(data);
		}

		if (defaultValue !== undefined && test === undefined)
		{
			return defaultValue;
		}

		return result;
	}

	function getArrayDuplicates(arr)
	{
		var itemCounters = {};
		var item, type;

		for (var i = 0, l = arr.length; i < l; i++)
		{
			item = arr[i];
			type = realTypeOf(item);

			if (type === BOOLEAN || type === NUMBER || type === STRING || type === NULL || type === UNDEFINED)
			{
				itemCounters[item] = (itemCounters[item] || 0) + 1;
			}
			else
			{
				throw 'DataTester schema error: Can only test for duplicates on array containing only primitive values. Use function to provide compatible values';
			}
		}

		return Object.keys(itemCounters).filter(function(item)
		{
			return itemCounters[item] > 1;
		});
	}

	function validateObjectKeys(obj, keys)
	{
		if (Object.keys(obj).length === keys.length)
		{
			for (var i = 0, l = keys.length; i < l; i++)
			{
				if (obj[keys[i]] === undefined)
				{
					return false;
				}
			}

			return true;
		}

		return false;
	}

	/**
	 * Utility function for comparing two objects and retrieving the different and common properties and values
	 * @param {*} leftObj - Value to be compared to value in the rightObj
	 * @param {*} rightObj - Value to be compared to value in the leftObj
	 * @returns {Object} Object containing leftObj diffs, rightObj diffs and common values
	 */
	function recursiveDiff(leftObj, rightObj)
	{
		var leftObjDiff;
		var rightObjDiff;
		var objCommon;

		var hasLeftDiff = false;
		var hasRightDiff = false;
		var hasCommon = false;

		var leftObjKeys = Object.keys(leftObj);
		var rightObjKeys = Object.keys(rightObj);
		var key, valueLeft, valueRight;
		var leftValueConstructor, rightValueConstructor;
		var recursiveResult, i, l;


		leftValueConstructor = leftObj && leftObj.constructor || null;
		rightValueConstructor = rightObj && rightObj.constructor || null;

		if (leftValueConstructor === rightValueConstructor && (leftValueConstructor === Object || leftValueConstructor === Array))
		{
			if (leftValueConstructor)
			{
				leftObjDiff = new leftValueConstructor();
				rightObjDiff = new leftValueConstructor();
				objCommon = new leftValueConstructor();
			}
			else
			{
				throw 'Only arrays and plain objects are allowed';
			}
		}
		else
		{
			return {
				leftDiff: leftObj,
				rightDiff: rightObj,
				common: null
			}
		}

		for (i = 0, l = leftObjKeys.length; i < l; i++)
		{
			key = leftObjKeys[i];
			valueLeft = leftObj[key];

			if (key in rightObj)
			{
				valueRight = rightObj[key];

				if (typeof valueLeft !== OBJECT && typeof valueRight !== OBJECT)
				{
					if (valueLeft === valueRight)
					{
						objCommon[key] = valueLeft;
						hasCommon = true;
					}
					else
					{
						leftObjDiff[key] = valueLeft;
						rightObjDiff[key] = valueRight;
						hasLeftDiff = true;
						hasRightDiff = true;
					}
				}
				else
				{
					leftValueConstructor = valueLeft && valueLeft.constructor;
					rightValueConstructor = valueRight && valueRight.constructor;

					if (leftValueConstructor === rightValueConstructor)
					{
						if (!leftValueConstructor)
						{
							if (valueLeft === valueRight)
							{
								objCommon[key] = valueLeft;
								hasCommon = true;
							}
							else
							{
								leftObjDiff[key] = valueLeft;
								rightObjDiff[key] = valueRight;
							}
						}
						else
						{
							switch (leftValueConstructor)
							{
								case Array:
								case Object:
									recursiveResult = recursiveDiff(valueLeft, valueRight);

									if (recursiveResult.leftDiff)
									{
										leftObjDiff[key] = recursiveResult.leftDiff;
										hasLeftDiff = true;
									}

									if (recursiveResult.rightDiff)
									{
										rightObjDiff[key] = recursiveResult.rightDiff;
										hasRightDiff = true;
									}

									if (recursiveResult.common)
									{
										objCommon[key] = recursiveResult.common;
										hasCommon = true;
									}

									break;

								default:
									if (valueLeft.toString() === valueRight.toString())
									{
										objCommon[key] = valueLeft;
										hasCommon = true;
									}
									else
									{
										leftObjDiff[key] = valueLeft;
										rightObjDiff[key] = valueRight;
										hasLeftDiff = true;
										hasRightDiff = true;
									}
							}
						}
					}
					else
					{
						leftObjDiff[key] = valueLeft;
						rightObjDiff[key] = valueRight;
						hasLeftDiff = true;
						hasRightDiff = true;
					}
				}

			}
			else
			{
				leftObjDiff[key] = valueLeft;
				hasLeftDiff = true;
			}
		}

		for (i = 0, l = rightObjKeys.length; i < l; i++)
		{
			key = rightObjKeys[i];

			if (!(key in leftObj))
			{
				rightObjDiff[key] = rightObj[key];
				hasRightDiff = true;
			}
		}

		return {
			leftDiff: hasLeftDiff && leftObjDiff || null,
			rightDiff: hasRightDiff && rightObjDiff || null,
			common: hasCommon && objCommon || null
		}
	}


	if (typeof exports !== UNDEFINED)
	{
		if (typeof module !== UNDEFINED && module.exports)
		{
			exports = module.exports = JDTester;
		}

		exports.JDTester = JDTester;
	}
	else
	{
		if (this.JDTester)
		{
			throw 'JDTester variable is already assigned';
		}
		else
		{
			this.JDTester = JDTester;
		}
	}

}.call(this));
