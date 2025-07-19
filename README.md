# axfinn_blogs

This repository contains the source code for my personal blog, which is built using the [Hugo](https://gohugo.io/) static site generator.

The blog is automatically deployed to [axfinn.github.io](https://axfinn.github.io).

## Project Structure

- `archetypes/`: Content template files.
- `content/`: The main content of the blog, written in Markdown.
- `layouts/`: Custom layout files.
- `static/`: Static assets like images, CSS, and JavaScript.
- `themes/`: The theme used for the blog.
- `config.toml`: The main configuration file for the Hugo site.
- `publish.sh`: A shell script to automate the build and deployment process.

## Usage

### Prerequisites

- [Git](https://git-scm.com/)
- [Hugo](https://gohugo.io/getting-started/installing/)

### Running Locally

1.  Clone the repository:
    ```bash
    git clone [repository-url]
    cd axfinn_blogs
    ```

2.  Initialize the theme submodule (if any):
    ```bash
    git submodule update --init --recursive
    ```

3.  Start the local Hugo server:
    ```bash
    hugo server -D
    ```
    The site will be available at `http://localhost:1313`. The `-D` flag includes posts marked as drafts.

### Creating New Content

To create a new blog post, run:

```bash
hugo new blog/my-new-post.md
```

This will create a new Markdown file in the `content/blog/` directory with the appropriate front matter.

### Publishing

The `publish.sh` script automates the process of building the site and deploying it to the `axfinn.github.io` repository.

```bash
sh ./publish.sh "Your commit message"
```