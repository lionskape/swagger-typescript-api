const { SCHEMA_TYPES } = require("../constants");
const _ = require("lodash");

class SchemaFormatters {
  /** @type {CodeGenConfig} */
  config;
  /** @type {Logger} */
  logger;
  /** @type {TemplatesWorker} */
  templatesWorker;
  /** @type {SchemaUtils} */
  schemaUtils;

  /**
   * @param schemaParser {SchemaParser | SchemaParserFabric}
   */
  constructor(schemaParser) {
    this.config = schemaParser.config;
    this.logger = schemaParser.logger;
    this.schemaUtils = schemaParser.schemaUtils;
    this.templatesWorker = schemaParser.templatesWorker;
  }

  base = {
    [SCHEMA_TYPES.ENUM]: (parsedSchema) => {
      if (this.config.generateUnionEnums) {
        return {
          ...parsedSchema,
          $content: parsedSchema.content,
          content: this.config.Ts.UnionType(
            _.map(parsedSchema.content, ({ value }) => value),
          ),
        };
      }

      return {
        ...parsedSchema,
        $content: parsedSchema.content,
        content: this.config.Ts.EnumFieldsWrapper(parsedSchema.content),
      };
    },
    [SCHEMA_TYPES.OBJECT]: (parsedSchema) => {
      if (parsedSchema.nullable)
        return this.inline[SCHEMA_TYPES.OBJECT](parsedSchema);
      return {
        ...parsedSchema,
        $content: parsedSchema.content,
        content: this.formatObjectContent(parsedSchema.content),
      };
    },
    [SCHEMA_TYPES.PRIMITIVE]: (parsedSchema) => {
      return {
        ...parsedSchema,
        $content: parsedSchema.content,
      };
    },
  };
  inline = {
    [SCHEMA_TYPES.ENUM]: (parsedSchema) => {
      return {
        ...parsedSchema,
        content: parsedSchema.$ref
          ? parsedSchema.typeName
          : this.config.Ts.UnionType(
              _.compact([
                ..._.map(parsedSchema.content, ({ value }) => `${value}`),
                parsedSchema.nullable && this.config.Ts.Keyword.Null,
              ]),
            ) || this.config.Ts.Keyword.Any,
      };
    },
    [SCHEMA_TYPES.OBJECT]: (parsedSchema) => {
      if (_.isString(parsedSchema.content)) {
        return {
          ...parsedSchema,
          typeIdentifier: this.config.Ts.Keyword.Type,
          content: this.schemaUtils.safeAddNullToType(parsedSchema.content),
        };
      }

      return {
        ...parsedSchema,
        typeIdentifier: this.config.Ts.Keyword.Type,
        content: this.schemaUtils.safeAddNullToType(
          parsedSchema,
          parsedSchema.content.length
            ? this.config.Ts.ObjectWrapper(
                this.formatObjectContent(parsedSchema.content),
              )
            : this.config.Ts.RecordType(
                this.config.Ts.Keyword.String,
                this.config.Ts.Keyword.Any,
              ),
        ),
      };
    },
  };

  /**
   * @param parsedSchema {Record<string, any>}
   * @param formatType {"base" | "inline"}
   */
  formatSchema = (parsedSchema, formatType = "base") => {
    const schemaType =
      _.get(parsedSchema, ["schemaType"]) ||
      _.get(parsedSchema, ["$parsed", "schemaType"]);
    const formatterFn = _.get(this, [formatType, schemaType]);
    return formatterFn?.(parsedSchema) || parsedSchema;
  };

  formatDescription = (description, inline) => {
    if (!description) return "";

    let prettified = description;

    prettified = _.replace(prettified, /\*\//g, "*/");

    const hasMultipleLines = _.includes(prettified, "\n");

    if (!hasMultipleLines) return prettified;

    if (inline) {
      return _(prettified)
        .split(/\n/g)
        .map((part) => _.trim(part))
        .compact()
        .join(" ")
        .valueOf();
    }

    return _.replace(prettified, /\n$/g, "");
  };

  formatObjectContent = (content) => {
    const fields = [];

    for (const part of content) {
      const extraSpace = "  ";
      const result = `${extraSpace}${part.field},\n`;

      const renderedJsDoc = this.templatesWorker.renderTemplate(
        this.config.templatesToRender.dataContractJsDoc,
        {
          data: part,
        },
      );

      const routeNameFromTemplate = renderedJsDoc
        .split("\n")
        .map((c) => `${extraSpace}${c}`)
        .join("\n");

      if (routeNameFromTemplate) {
        fields.push(`${routeNameFromTemplate}${result}`);
      } else {
        fields.push(`${result}`);
      }
    }

    return fields.join("");
  };
}

module.exports = {
  SchemaFormatters,
};
