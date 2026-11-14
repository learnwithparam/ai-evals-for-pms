# Picks candidates

For the page pass. Cut each part to 4 to 6 picks, at least 2 videos, then delete this file. Each line gives the author, the year and why it passes the bar in STANDARD-v2 section 5 (made by the person or team who made or runs the method, evergreen, not a listicle or paywall). I wrote these from memory and did not open the links. The page pass must confirm each URL is live and the year is right before it goes on a page. Items marked "weaker" are borderline on the bar and should be cut first.

## 00 Orientation (meet Lantern Trails)

1. Hamel Husain, "Your AI Product Needs Evals", 2024, blog. Written by a practitioner who runs evals for client products. Evergreen: it argues for looking at data first. Read.
2. Anthropic Engineering, "Building effective agents", 2024, blog. Written by the team that builds Claude agents. Evergreen: it separates workflows from agents. Read.
3. Anthropic Engineering, "Demystifying evals for AI agents", already cited in part 2. Same team, about their own evals. Read.
4. Eugene Yan, "Product Evals in Three Simple Steps", 2025, blog. A working applied scientist writing from production use. Read.
5. Barry Zhang and Erik Schluntz, "Building Effective Agents" talk, 2025, conference video. Made by the authors of the Anthropic post. Video.
6. OpenAI Platform docs, "Evals design best practices", docs. Official docs from the vendor, about the idea of evals. Read.
7. Hamel Husain and Shreya Shankar, "LLM Evals: Everything You Need to Know", 2025, FAQ. By the two people who teach the error analysis method used in this course. Read.
8. Hamel Husain and Shreya Shankar, free lesson on AI evals for engineers and PMs, 2025, YouTube. The method makers teaching it. Video. Confirm it is public, not behind a course login.

## 01 Look before you measure

1. Hamel Husain, "A Field Guide to Rapidly Improving AI Products", 2025, blog. Makes the case for reading traces and counting failure types. Read.
2. Hamel Husain and Shreya Shankar, "LLM Evals: Everything You Need to Know", 2025, FAQ. Error analysis and open coding, from the people who teach it. Read.
3. Shreya Shankar, J.D. Zamfirescu-Pereira, Bjorn Hartmann, Aditya Parameswaran, Ian Arawjo, "Who Validates the Validators?", 2024, UIST paper. Original research that found people only learn their criteria by reading outputs. Read.
4. Eugene Yan, "Task-Specific LLM Evals that Do & Don't Work", 2024, blog. Practitioner write-up from production work. Read.
5. Anthropic Engineering, "Demystifying evals for AI agents", blog. Covers reading transcripts. Read.
6. Xie et al., "TravelPlanner", 2024, ICML paper from the OSU NLP Group. Original benchmark behind the course's travel world. Read.
7. Barnett et al., "Seven Failure Points When Engineering a RAG System", 2024, paper. Original paper, supports the stage breakdown step. Read.
8. Jason Liu, "Systematically Improving Your RAG", 2024, talk and blog. Separates search failures from answer failures, which is the idea in the break-down-the-stages step. Video.
9. Yao et al., "tau-bench", 2024, Sierra research paper. Original benchmark that grades agents turn by turn. Read.
10. Anthropic Engineering, "Building effective agents", 2024. Shows the lookup then plan shape of agents. Read.

## 02 Define good

1. Hamel Husain, "Creating a LLM-as-a-Judge That Drives Business Results", 2024, blog. Written by the practitioner who made the method. Read.
2. Anthropic Engineering, "Demystifying evals for AI agents", blog. Says when to use a code grader and when to use a model grader. Read.
3. OpenAI Platform docs, "Evals design best practices", docs. Official guidance on graders. Read.
4. Eugene Yan, "Evaluating the Effectiveness of LLM-Evaluators", 2024, blog. A literature review by a practitioner. Read.
5. Jacob Cohen, "A coefficient of agreement for nominal scales", 1960, paper. The original kappa paper. Read.
6. Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", 2023, NeurIPS paper. The original paper on model judges. Read.
7. Hamel Husain and Shreya Shankar, "LLM Evals: Everything You Need to Know", 2025, FAQ. Covers binary labels over scales. Read.
8. Anthropic docs, "Define your success criteria", official docs. Evergreen: it tells you to write criteria before you test. Read.
9. Barry Zhang, talk on evals for agents, 2025, conference video. Check that a talk exists before using. Video. Weaker if not found.

## 03 Check the judge

1. Shreya Shankar et al., "Who Validates the Validators?", 2024, UIST paper. The original research on aligning a judge with human labels. Read.
2. Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena", 2023, NeurIPS paper. Names the known judge biases. Read.
3. Hamel Husain, "Creating a LLM-as-a-Judge That Drives Business Results", 2024, blog. Critique before verdict, and checking the judge against a person. Read.
4. Eugene Yan, "Evaluating the Effectiveness of LLM-Evaluators", 2024, blog. Practitioner review of judge accuracy. Read.
5. Rogan and Gladen, "Estimating prevalence from the results of a screening test", 1978, American Journal of Epidemiology. The original paper for the pass rate correction. Read.
6. Lee et al., "How to Correctly Report LLM-as-a-Judge Evaluations", 2025, arXiv. Research on bias correction of judge scores. Confirm the title and authors before use. Read.
7. Anthropic Engineering, "Demystifying evals for AI agents", blog. Says to calibrate model graders against humans. Read.
8. Hamel Husain and Shreya Shankar, free lesson on judges, 2025, YouTube. Method makers teaching true positive and true negative rates. Video.
9. Josh Starmer, StatQuest, sensitivity and specificity, YouTube. Weaker: an educator, not the method maker. Video.

## 04 Decide and write it down

1. Ron Kohavi, Diane Tang, Ya Xu, "Trustworthy Online Controlled Experiments", 2020, book from Cambridge University Press. Written by people who ran experiments at Microsoft, Google and LinkedIn. Read. Not free, so check the paywall rule. Weaker.
2. Ron Kohavi, talk on online controlled experiments, conference video. By the author of the method. Video. Confirm a free video exists.
3. Evan Miller, "Adding Error Bars to Evals", 2024, Anthropic, arXiv. The original paper on repeat runs and error bars for model evals. Read.
4. Anthropic Engineering, "Demystifying evals for AI agents", blog. Covers running several trials per task. Read.
5. Hamel Husain, "A Field Guide to Rapidly Improving AI Products", 2025, blog. Covers the weekly review. Read.
6. Eugene Yan, "Product Evals in Three Simple Steps", 2025, blog. Ties evals to a product decision. Read.
7. Hamel Husain and Shreya Shankar, "LLM Evals: Everything You Need to Know", 2025, FAQ. Covers CI gates and ship rules. Read.
8. Andrew Ng, DeepLearning.AI short course or talk on error analysis for agentic work, 2025, video. Made by the course's own author. Video. Confirm the title.
9. OpenAI Platform docs, "Evals design best practices", docs. Official guidance on tying evals to goals. Read.
10. Google SRE Book, "Embracing Risk", 2016, free online. Made by the team that runs Google production. Evergreen: it frames error budgets. Read.

## 05 Review answers with the Langfuse queue

1. Langfuse docs, "Annotation queues", official docs. Written by the team that makes the tool. Read.
2. Langfuse docs, "Human annotation", official docs. Same team. Read.
3. Langfuse docs, "Scores and evaluation", official docs. Explains scores on traces. Read.
4. Hamel Husain, "A Field Guide to Rapidly Improving AI Products", 2025, blog. Argues for a simple review tool built around the data. Read.
5. Hamel Husain, "Using LLMs for evals without losing the human", or a similar post on review tools. Confirm the title before use. Read.
6. Shreya Shankar et al., "Who Validates the Validators?", 2024, UIST paper. Why human review keeps the judge honest. Read.
7. Langfuse, product walkthrough video on annotation queues, YouTube. Made by the tool maker. Video. Confirm it exists.
8. Anthropic Engineering, "Demystifying evals for AI agents", blog. Covers human review as a grader. Read.
