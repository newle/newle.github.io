---
layout: post
title: "Jekyll支持的Markdown"
subtitle: ''
author: "zhen.wang"
header-style: text

---

## 数据来源

[Markdown Options In Jekyll](http://jekyllrb.com/docs/configuration/markdown/)
[kramdown](https://kramdown.gettalong.org/options.html)

## kramdown支持的配置项

1. `auto_id_prefix`

> Prefix used for automatically generated header IDs
This option can be used to set a prefix for the automatically generated header IDs so that there is no conflict when rendering multiple kramdown documents into one output file separately. The prefix should only contain characters that are valid in an ID!

> Default: ‘’
Used by: HTML/Latex converter

2. `auto_id_stripping: true的话，则自动生成header的数字前缀1.1之类的`

> Strip all formatting from header text for automatic ID generation
If this option is true, only the text elements of a header are used for generating the ID later (in contrast to just using the raw header text line).

> This option will be removed in version 2.0 because this will be the default then.

> Default: false
Used by: kramdown parser

3. `auto_ids: 自动标题Id生成`

> Use automatic header ID generation
> If this option is true, ID values for all headers are automatically generated if no ID is explicitly specified.

> Default: true
> Used by: HTML/Latex converter

4. `entity_output`

> Defines how entities are output
> The possible values are :as_input (entities are output in the same form as found in the input), :numeric (entities are output in numeric form), :symbolic (entities are output in symbolic form if possible) or :as_char (entities are output as characters if possible, only available on Ruby 1.9).

> Default: :as_char
> Used by: HTML converter, kramdown converter

5. `footnote_backlink: 脚注文本`

> Defines the text that should be used for the footnote backlinks
The footnote backlink is just text, so any special HTML characters will be escaped.

> If the footnote backlint text is an empty string, no footnote backlinks will be generated.

> Default: ‘&8617;’
Used by: HTML converter

4. `footnote_backlink_inline`

> Specifies whether the footnote backlink should always be inline
With the default of false the footnote backlink is placed at the end of the last paragraph if there is one, or an extra paragraph with only the footnote backlink is created.

> Setting this option to true tries to place the footnote backlink in the last, possibly nested paragraph or header. If this fails (e.g. in the case of a table), an extra paragraph with only the footnote backlink is created.

> Default: false
> Used by: HTML converter

7. `footnote_nr`

The number of the first footnote
This option can be used to specify the number that is used for the first footnote.

Default: 1
Used by: HTML converter

footnote_prefix
Prefix used for footnote IDs
This option can be used to set a prefix for footnote IDs. This is useful when rendering multiple documents into the same output file to avoid duplicate IDs. The prefix should only contain characters that are valid in an ID!

Default: ‘’
Used by: HTML

8. `forbidden_inline_options`

Defines the options that may not be set using the {::options} extension
Default: template
Used by: HTML converter

9. `header_offset`

Sets the output offset for headers
If this option is c (may also be negative) then a header with level n will be output as a header with level c+n. If c+n is lower than 1, level 1 will be used. If c+n is greater than 6, level 6 will be used.

Default: 0
Used by: HTML converter, Kramdown converter, Latex converter

10. `html_to_native`

Convert HTML elements to native elements
If this option is true, the parser converts HTML elements to native elements. For example, when parsing <em>hallo</em> the emphasis tag would normally be converted to an :html element with tag type :em. If html_to_native is true, then the emphasis would be converted to a native :em element.

This is useful for converters that cannot deal with HTML elements.

Default: false
Used by: kramdown parser

11. `latex_headers`

Defines the LaTeX commands for different header levels
The commands for the header levels one to six can be specified by separating them with commas.

Default: section,subsection,subsubsection,paragraph,subparagraph,subparagraph
Used by: Latex converter

12. `line_width`

Defines the line width to be used when outputting a document
Default: 72
Used by: kramdown converter

13. `link_defs`

Pre-defines link definitions
This option can be used to pre-define link definitions. The value needs to be a Hash where the keys are the link identifiers and the values are two element Arrays with the link URL and the link title.

If the value is a String, it has to contain a valid YAML hash and the hash has to follow the above guidelines.

Default: {}
Used by: kramdown parser


14. `math_engine`

Set the math engine
Specifies the math engine that should be used for converting math blocks/spans. If this option is set to +nil+, no math engine is used and the math blocks/spans are output as is.

Options for the selected math engine can be set with the math_engine_opts configuration option.

Default: mathjax
Used by: HTML converter

15. `math_engine_opts`

Set the math engine options
Specifies options for the math engine set via the math_engine configuration option.

The value needs to be a hash with key-value pairs that are understood by the used math engine.

Default: {}
Used by: HTML converter

16. `parse_block_html`

Process kramdown syntax in block HTML tags
If this option is true, the kramdown parser processes the content of block HTML tags as text containing block-level elements. Since this is not wanted normally, the default is false. It is normally better to selectively enable kramdown processing via the markdown attribute.

Default: false
Used by: kramdown parser

17. `parse_span_html`

Process kramdown syntax in span HTML tags
If this option is true, the kramdown parser processes the content of span HTML tags as text containing span-level elements.

Default: true
Used by: kramdown parser

18. `remove_block_html_tags`

Remove block HTML tags
If this option is true, the RemoveHtmlTags converter removes block HTML tags.

Default: true
Used by: RemoveHtmlTags converter

19. `remove_line_breaks_for_cjk`

Specifies whether line breaks should be removed between CJK characters
Default: false
Used by: HTML converter

20. `remove_span_html_tags`

Remove span HTML tags
If this option is true, the RemoveHtmlTags converter removes span HTML tags.

Default: false
Used by: RemoveHtmlTags converter

21. `smart_quotes`

Defines the HTML entity names or code points for smart quote output
The entities identified by entity name or code point that should be used for, in order, a left single quote, a right single quote, a left double and a right double quote are specified by separating them with commas.

Default: lsquo,rsquo,ldquo,rdquo
Used by: HTML/Latex converter

22. `syntax_highlighter`

Set the syntax highlighter
Specifies the syntax highlighter that should be used for highlighting code blocks and spans. If this option is set to +nil+, no syntax highlighting is done.

Options for the syntax highlighter can be set with the syntax_highlighter_opts configuration option.

Default: rouge
Used by: HTML/Latex converter

23. `syntax_highlighter_opts`

Set the syntax highlighter options
Specifies options for the syntax highlighter set via the syntax_highlighter configuration option.

The value needs to be a hash with key-value pairs that are understood by the used syntax highlighter.

Default: {}
Used by: HTML/Latex converter

24. `template`

The name of an ERB template file that should be used to wrap the output or the ERB template itself.
This is used to wrap the output in an environment so that the output can be used as a stand-alone document. For example, an HTML template would provide the needed header and body tags so that the whole output is a valid HTML file. If no template is specified, the output will be just the converted text.

When resolving the template file, the given template name is used first. If such a file is not found, the converter extension (the same as the converter name) is appended. If the file still cannot be found, the templates name is interpreted as a template name that is provided by kramdown (without the converter extension). If the file is still not found, the template name is checked if it starts with ‘string://’ and if it does, this prefix is removed and the rest is used as template content.

kramdown provides a default template named ‘document’ for each converter.

Default: ‘’
Used by: all converters

25. `toc_levels`

Defines the levels that are used for the table of contents
The individual levels can be specified by separating them with commas (e.g. 1,2,3) or by using the range syntax (e.g. 1..3). Only the specified levels are used for the table of contents.

Default: 1..6
Used by: HTML/Latex converter

26. `transliterated_header_ids`

Transliterate the header text before generating the ID
Only ASCII characters are used in headers IDs. This is not good for languages with many non-ASCII characters. By enabling this option the header text is transliterated to ASCII as good as possible so that the resulting header ID is more useful.

The stringex library needs to be installed for this feature to work!

Default: false
Used by: HTML/Latex converter

27. `typographic_symbols`

Defines a mapping from typographical symbol to output characters
Typographical symbols are normally output using their equivalent Unicode codepoint. However, sometimes one wants to change the output, mostly to fallback to a sequence of ASCII characters.

This option allows this by specifying a mapping from typographical symbol to its output string. For example, the mapping {hellip: …} would output the standard ASCII representation of an ellipsis.

The available typographical symbol names are:

hellip: ellipsis
mdash: em-dash
ndash: en-dash
laquo: left guillemet
raquo: right guillemet
laquo_space: left guillemet followed by a space
raquo_space: right guillemet preceeded by a space
Default: {}
Used by: HTML/Latex converter