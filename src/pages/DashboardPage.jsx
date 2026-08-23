import React, { useState, useMemo } from "react";
import { Code } from "lucide-react";
import { useGetCoursesQuery, useGetCategoriesQuery } from "../store/apiSlice";
import CourseCard from "../features/courses/CourseCard";
import CourseFilter from "../features/courses/CourseFilter";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: courses = [], isLoading: isCoursesLoading } = useGetCoursesQuery({
    category: selectedCategory,
    search: searchTerm,
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useGetCategoriesQuery();

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  // Client-side filtering in case query params are omitted
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchCat = selectedCategory ? course.category_id === selectedCategory : true;
      const matchSearch = searchTerm
        ? course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (course.slug && course.slug.toLowerCase().includes(searchTerm.toLowerCase()))
        : true;
      return matchCat && matchSearch;
    });
  }, [courses, selectedCategory, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Courses Catalog Section */}
      <div className="space-y-6">
        {/* Filters */}
        <CourseFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onReset={() => {
            setSelectedCategory("");
            setSearchTerm("");
          }}
        />

        {/* Course Grid */}
        {isCoursesLoading ? (
          <Spinner label="Loading programming courses..." size="lg" />
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
            <Code className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No courses matched your criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing the selected category filter.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("");
                setSearchTerm("");
              }}
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                categoryName={categoryMap[course.category_id] || course.category?.name || course.category_name || "Programming"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
