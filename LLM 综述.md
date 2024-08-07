- https://github.com/RUCAIBox/LLMSurvey/blob/main/assets/LLM_Survey_Chinese.pdf
- [综述.pdf](note/files/LLM_Survey_Chinese.pdf)。[English Version.pdf](note/files/English%20Version、.pdf)
- 为什么 LLM：在过去 20 年里，语言模型，。==统计语言模型==逐步发展成==神经语言模型==。接着在对 ==Transformer 模型==进行预训练 =  ==预训练模型（PLM）==，发现扩展模型规模可以提高模型能力。在扩展模型规模的过程中，出现了一些能力的涌现（比如上下文学习）。现在将模型规模达到百亿或者千亿的 PLM 称之为大语言模型（LLM）。我们关注 LLM 的 4 个主要方面：==预训练，适配微调，使用，能力评估==
- ==词的分布式表示== 
- word2vec 计算：
- Transformer 架构：
- 使用思维链（Chain of Thought) Can help LLM solve tasks which need to be solved step by step.
- 怎么避免 LLM 产出有害内容。
- LLM 对于文本以外形式的任务，表现不佳。所以可以支持插件形式，为 LLM 解决它不擅长的部分。相当于 LLM 的眼睛和耳朵。
- 强化学习（RL）： 近端策略优化 (Proximal Policy Optimization, PPO) 的论文在 2017 年 7 月发表 [81]，现在已经成为从人类偏好中学习的基础 RL 算法。
- 3 - 介绍了一些模型，不同规格的模型。 3.2 介绍了各种语料库。3.3 是代码库资源。
- 因果解码器架构采用单向注意力掩码？
- ICL 能力是什么能力？
- 前缀解码器架构可以加速收敛。
- 混合专家（Moe）
- 综合上述讨论，我们总结了现有文献中的详细配置建议。为了有更强的泛化能力和训练稳定性，建议选择前置的 RMS进行层标准化，并选择 SwiGLU 或 GeGLU 作为激活函数。此外，在位置编码方面，RoPE 或 ALiBi 是更好的选择，因为它们在长序列上表现更好。
- 语言建模/去噪自编码
- 批量训练： 不断增加批量的大小。
- 通常，量化技术被广泛用于减少 LLM 推理阶段的时间和空间开销。已经将量化模型副本发布到 ==Hugging Face== 上
- 格式化已有数据集/格式化人类需求。
- 本节中，我们将介绍两种适配预训练后的 LLM 的方法：指令微调（instruction tuning）和对齐微调（alignment tuning）。
- 使用适当数量的示例作为示范 [64]，对模型可以产生实质性的改进，这也减轻了其对指令工程的敏感性 [62, 64]。然而，将其他部分（例如避免事项、原因和建议）添加到指令中对 LLM 的性能提升十分轻微，甚至会产生不利的影响 [93, 207]。
- 在实践中，根据不同的数据集，最大容量通常设置为几千或几万个实例 [62, 64]。
- 5.2 对齐微调 - 有用/诚实/无害
- 6 使用方法
	- 使用任务描述或者示范 - 上下文学习
	- 思维链 - 通过一系列中间推理步骤加入提示中来增强ICL。可以只是让LLM 生成 CoT 推理路径，来实现 0 CoT，消除人工操作。其中，首先通过用“Let’s think step by step”提示 LLM 来生成推理步骤，然后通过用“Therefore, the answer is”提示来得出最终答案。
- 7 能力评测
- 